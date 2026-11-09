using Microsoft.EntityFrameworkCore;
using NeighborhoodPizza.Data;

namespace NeighborhoodPizza.Endpoints;

public sealed record SubmitOrderItem(string? Size, List<string>? Toppings, int Quantity);
public sealed record SubmitOrderRequest(string? CustomerName, List<SubmitOrderItem>? Items);

public sealed record ToppingDto(string Id, string Name);
public sealed record OrderItemDto(
    string Size, string SizeName, List<ToppingDto> Toppings, int Quantity, int UnitPriceCents, int LineTotalCents);
public sealed record OrderDto(
    int OrderNumber, string CustomerName, string Status, DateTime CreatedAt, DateTime? ReadyAt,
    int TotalCents, List<OrderItemDto> Items);

public static class OrderEndpoints
{
    // Order numbers are the auto-increment Id plus this offset, so the first order is 1001.
    private const int OrderNumberOffset = 1000;

    public static void MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/orders", SubmitOrder);
        app.MapGet("/api/orders/{orderNumber:int}", GetOrder);
        app.MapGet("/api/orders", ListOrders);
        app.MapPost("/api/orders/{orderNumber:int}/ready", MarkReady);
    }

    public static Dictionary<string, string[]> Validate(SubmitOrderRequest? req)
    {
        var errors = new Dictionary<string, List<string>>();
        void Add(string key, string msg)
        {
            if (!errors.TryGetValue(key, out var list)) errors[key] = list = [];
            if (!list.Contains(msg)) list.Add(msg);
        }

        var name = req?.CustomerName?.Trim();
        if (string.IsNullOrEmpty(name)) Add("customerName", "Please enter your name.");
        else if (name.Length > Menu.MaxNameLength) Add("customerName", $"Name must be {Menu.MaxNameLength} characters or fewer.");

        var items = req?.Items;
        if (items is null || items.Count == 0)
        {
            Add("items", "Your order is empty.");
        }
        else
        {
            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                if (item is null)
                {
                    Add($"items[{i}]", "Invalid item.");
                    continue;
                }
                if (Menu.FindSize(item.Size) is null) Add($"items[{i}].size", "Unknown size.");
                var toppings = item.Toppings ?? [];
                if (toppings.Any(t => Menu.FindTopping(t) is null)) Add($"items[{i}].toppings", "Unknown topping.");
                if (toppings.Count != toppings.Distinct().Count()) Add($"items[{i}].toppings", "Each topping can be added once.");
                if (item.Quantity is < Menu.MinQuantity or > Menu.MaxQuantity)
                    Add($"items[{i}].quantity", $"Quantity must be between {Menu.MinQuantity} and {Menu.MaxQuantity}.");
            }
        }

        return errors.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray());
    }

    private static async Task<IResult> SubmitOrder(SubmitOrderRequest? req, PizzaDbContext db)
    {
        var errors = Validate(req);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var lines = req!.Items!.Select(item =>
        {
            var toppings = item.Toppings ?? [];
            var unit = Pricing.UnitPriceCents(item.Size!, toppings);
            return new OrderLine
            {
                Size = item.Size!,
                Quantity = item.Quantity,
                UnitPriceCents = unit,
                LineTotalCents = Pricing.LineTotalCents(unit, item.Quantity),
                Toppings = toppings.Select(t => new OrderLineTopping { ToppingId = t }).ToList(),
            };
        }).ToList();

        var order = new Order
        {
            CustomerName = req.CustomerName!.Trim(),
            Status = OrderStatus.New,
            CreatedAt = DateTime.UtcNow,
            TotalCents = Pricing.OrderTotalCents(lines.Select(l => l.LineTotalCents)),
            Lines = lines,
        };

        // Insert, then derive the order number from the generated Id, in one transaction.
        // SQLite holds the write lock for the whole transaction, so the placeholder never collides.
        await using (var tx = await db.Database.BeginTransactionAsync())
        {
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            order.OrderNumber = order.Id + OrderNumberOffset;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }

        return Results.Created($"/api/orders/{order.OrderNumber}", ToDto(order));
    }

    private static async Task<IResult> GetOrder(int orderNumber, PizzaDbContext db)
    {
        var order = await WithLines(db).FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        return order is null ? NotFound(orderNumber) : Results.Ok(ToDto(order));
    }

    private static async Task<IResult> ListOrders(string? status, PizzaDbContext db)
    {
        var query = WithLines(db);
        if (!string.IsNullOrEmpty(status))
        {
            if (!Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var s) || !Enum.IsDefined(s))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["status"] = ["Status must be New or Ready."] });
            query = query.Where(o => o.Status == s);
        }

        var orders = await query.ToListAsync();
        var sorted = orders.Where(o => o.Status == OrderStatus.New).OrderBy(o => o.CreatedAt).ThenBy(o => o.Id)
            .Concat(orders.Where(o => o.Status == OrderStatus.Ready).OrderByDescending(o => o.ReadyAt).ThenByDescending(o => o.Id));
        return Results.Ok(sorted.Select(ToDto));
    }

    private static async Task<IResult> MarkReady(int orderNumber, PizzaDbContext db)
    {
        var order = await WithLines(db).FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order is null) return NotFound(orderNumber);

        if (order.Status != OrderStatus.Ready)
        {
            order.Status = OrderStatus.Ready;
            order.ReadyAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return Results.Ok(ToDto(order));
    }

    private static IQueryable<Order> WithLines(PizzaDbContext db) =>
        db.Orders.Include(o => o.Lines).ThenInclude(l => l.Toppings).AsSplitQuery();

    private static IResult NotFound(int orderNumber) =>
        Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Order not found",
            detail: $"Order #{orderNumber} does not exist.");

    private static DateTime Utc(DateTime d) => DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public static OrderDto ToDto(Order o) => new(
        o.OrderNumber,
        o.CustomerName,
        o.Status.ToString(),
        Utc(o.CreatedAt),
        o.ReadyAt is { } r ? Utc(r) : null,
        o.TotalCents,
        o.Lines.OrderBy(l => l.Id).Select(l => new OrderItemDto(
            l.Size,
            Menu.FindSize(l.Size)?.Name ?? l.Size,
            l.Toppings.OrderBy(t => t.Id).Select(t => new ToppingDto(t.ToppingId, Menu.FindTopping(t.ToppingId)?.Name ?? t.ToppingId)).ToList(),
            l.Quantity,
            l.UnitPriceCents,
            l.LineTotalCents)).ToList());
}
