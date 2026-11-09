namespace NeighborhoodPizza.Data;

public enum OrderStatus
{
    New,
    Ready,
}

public class Order
{
    public int Id { get; set; }
    public int OrderNumber { get; set; }
    public string CustomerName { get; set; } = "";
    public OrderStatus Status { get; set; } = OrderStatus.New;
    public int TotalCents { get; set; }

    // Stored as UTC DateTime (not DateTimeOffset) so SQLite can sort on them.
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadyAt { get; set; }

    public List<OrderLine> Lines { get; set; } = [];
}

public class OrderLine
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string Size { get; set; } = "";
    public int Quantity { get; set; }
    public int UnitPriceCents { get; set; }
    public int LineTotalCents { get; set; }

    // Optional special instructions for this pizza, e.g. "well done". Null when none.
    public string? Instructions { get; set; }
    public List<OrderLineTopping> Toppings { get; set; } = [];
}

public class OrderLineTopping
{
    public int Id { get; set; }
    public int OrderLineId { get; set; }
    public string ToppingId { get; set; } = "";
}
