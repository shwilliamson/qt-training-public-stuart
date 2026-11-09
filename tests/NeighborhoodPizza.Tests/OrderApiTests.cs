using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using NeighborhoodPizza.Endpoints;
using static NeighborhoodPizza.Tests.TestHost;

namespace NeighborhoodPizza.Tests;

// AC-1.1, AC-2.1, AC-2.3, AC-3.1, AC-3.2
public class OrderApiTests : IDisposable
{
    private readonly TestHost _host = new();
    private HttpClient Client => _host.Client;

    public void Dispose() => _host.Dispose();

    private async Task<Dictionary<string, string[]>> PostExpectingErrors(object body)
    {
        var res = await Client.PostAsJsonAsync("/api/orders", body);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("errors").Deserialize<Dictionary<string, string[]>>()!;
    }

    [Fact]
    public async Task Menu_ReturnsSizesAndToppingsWithPrices()
    {
        using var doc = JsonDocument.Parse(await Client.GetStringAsync("/api/menu"));
        var sizes = doc.RootElement.GetProperty("sizes").EnumerateArray()
            .ToDictionary(s => s.GetProperty("id").GetString()!, s => s.GetProperty("priceCents").GetInt32());
        var toppings = doc.RootElement.GetProperty("toppings").EnumerateArray()
            .ToDictionary(s => s.GetProperty("id").GetString()!, s => s.GetProperty("priceCents").GetInt32());

        Assert.Equal(new Dictionary<string, int> { ["small"] = 1000, ["large"] = 1400 }, sizes);
        Assert.Equal(["pepperoni", "mushrooms", "onions", "green-peppers"], toppings.Keys);
        Assert.All(toppings.Values, p => Assert.Equal(200, p));
    }

    [Fact]
    public async Task Submit_Returns201WithNumberNameItemsTotal()
    {
        var res = await Client.PostAsJsonAsync("/api/orders", new
        {
            customerName = "  Pat  ",
            items = new[] { new { size = "large", toppings = new[] { "pepperoni", "onions" }, quantity = 2 } },
        });

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var order = (await res.Content.ReadFromJsonAsync<OrderDto>(Json))!;
        Assert.Equal($"/api/orders/{order.OrderNumber}", res.Headers.Location?.OriginalString);
        Assert.True(order.OrderNumber >= 1001);
        Assert.Equal("Pat", order.CustomerName);
        Assert.Equal("New", order.Status);
        var item = Assert.Single(order.Items);
        Assert.Equal("large", item.Size);
        Assert.Equal("Large pizza (14\")", item.SizeName);
        Assert.Equal(["Pepperoni", "Onions"], item.Toppings.Select(t => t.Name));
        Assert.Equal(2, item.Quantity);
        Assert.Equal(1800, item.UnitPriceCents);
        Assert.Equal(3600, item.LineTotalCents);
        Assert.Equal(3600, order.TotalCents);

        // The confirmation data can be re-fetched by number.
        var fetched = await Client.GetFromJsonAsync<OrderDto>($"/api/orders/{order.OrderNumber}", Json);
        Assert.Equal(order.TotalCents, fetched!.TotalCents);
        Assert.Equal("Pat", fetched.CustomerName);
    }

    [Fact]
    public async Task Submit_MultipleLinesDifferentConfigs()
    {
        var order = await _host.SubmitAsync("Sam",
            Item("small"),
            Item("large", 3, "mushrooms"),
            Item("small", 2, "pepperoni", "mushrooms", "onions", "green-peppers"));

        Assert.Equal(3, order.Items.Count);
        Assert.Equal([1000, 1600, 1800], order.Items.Select(i => i.UnitPriceCents));
        Assert.Equal([1000, 4800, 3600], order.Items.Select(i => i.LineTotalCents));
        Assert.Equal(9400, order.TotalCents);
        Assert.Empty(order.Items[0].Toppings);
    }

    [Fact]
    public async Task Submit_AcceptsAnySizeAndToppingCombination()
    {
        string[] all = ["pepperoni", "mushrooms", "onions", "green-peppers"];
        var items = new List<object>();
        foreach (var size in new[] { "small", "large" })
            for (var mask = 0; mask < 16; mask++)
                items.Add(Item(size, 1, all.Where((_, i) => (mask & (1 << i)) != 0).ToArray()));

        var order = await _host.SubmitAsync("Combo", items.ToArray());

        Assert.Equal(32, order.Items.Count);
        // 16 subsets have 32 toppings in total, per size.
        Assert.Equal(16 * 1000 + 16 * 1400 + 2 * 32 * 200, order.TotalCents);
    }

    [Fact]
    public async Task Submit_IgnoresClientSuppliedPrices()
    {
        var res = await Client.PostAsJsonAsync("/api/orders", new
        {
            customerName = "Cheapskate",
            totalCents = 1,
            items = new[] { new { size = "large", toppings = Array.Empty<string>(), quantity = 1, unitPriceCents = 1, lineTotalCents = 1 } },
        });
        var order = (await res.Content.ReadFromJsonAsync<OrderDto>(Json))!;
        Assert.Equal(1400, order.TotalCents);
        Assert.Equal(1400, order.Items[0].UnitPriceCents);
    }

    [Fact]
    public async Task Submit_AssignsConsecutiveOrderNumbers()
    {
        var a = await _host.SubmitAsync("A", Item("small"));
        var b = await _host.SubmitAsync("B", Item("small"));
        Assert.Equal(1001, a.OrderNumber);
        Assert.Equal(a.OrderNumber + 1, b.OrderNumber);
    }

    [Fact]
    public async Task Submit_RejectsEmptyItems()
    {
        var errors = await PostExpectingErrors(new { customerName = "Pat", items = Array.Empty<object>() });
        Assert.Equal(["Your order is empty."], errors["items"]);

        errors = await PostExpectingErrors(new { customerName = "Pat" });
        Assert.Equal(["Your order is empty."], errors["items"]);
    }

    [Fact]
    public async Task Submit_RejectsBlankName()
    {
        var errors = await PostExpectingErrors(new { items = new[] { Item("small") } });
        Assert.Equal(["Please enter your name."], errors["customerName"]);

        errors = await PostExpectingErrors(new { customerName = "", items = new[] { Item("small") } });
        Assert.Equal(["Please enter your name."], errors["customerName"]);
    }

    [Fact]
    public async Task Submit_RejectsWhitespaceName()
    {
        var errors = await PostExpectingErrors(new { customerName = "   \t ", items = new[] { Item("small") } });
        Assert.Equal(["Please enter your name."], errors["customerName"]);
    }

    [Fact]
    public async Task Submit_RejectsNameOver50Chars()
    {
        var errors = await PostExpectingErrors(new { customerName = new string('x', 51), items = new[] { Item("small") } });
        Assert.Equal(["Name must be 50 characters or fewer."], errors["customerName"]);

        // Exactly 50 after trimming is fine.
        await _host.SubmitAsync("  " + new string('x', 50) + "  ", Item("small"));
    }

    [Fact]
    public async Task Submit_RejectsUnknownSizeAndTopping()
    {
        var errors = await PostExpectingErrors(new
        {
            customerName = "Pat",
            items = new[] { Item("medium"), Item("small", 1, "anchovies") },
        });
        Assert.Equal(["Unknown size."], errors["items[0].size"]);
        Assert.Equal(["Unknown topping."], errors["items[1].toppings"]);
    }

    [Fact]
    public async Task Submit_RejectsDuplicateTopping()
    {
        var errors = await PostExpectingErrors(new { customerName = "Pat", items = new[] { Item("small", 1, "onions", "onions") } });
        Assert.Equal(["Each topping can be added once."], errors["items[0].toppings"]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(21)]
    public async Task Submit_RejectsQuantityOutOfRange(int qty)
    {
        var errors = await PostExpectingErrors(new { customerName = "Pat", items = new[] { Item("small", qty) } });
        Assert.Equal(["Quantity must be between 1 and 20."], errors["items[0].quantity"]);
    }

    [Fact]
    public async Task Submit_AcceptsQuantityBounds()
    {
        var order = await _host.SubmitAsync("Pat", Item("small", 1), Item("large", 20));
        Assert.Equal(1000 + 20 * 1400, order.TotalCents);
    }

    [Fact]
    public async Task Submit_ReportsAllErrorsTogether()
    {
        var errors = await PostExpectingErrors(new { customerName = " ", items = new[] { Item("medium", 0) } });
        Assert.Contains("customerName", errors.Keys);
        Assert.Contains("items[0].size", errors.Keys);
        Assert.Contains("items[0].quantity", errors.Keys);
    }

    [Fact]
    public async Task Submit_RejectedOrders_AreNotSaved()
    {
        await PostExpectingErrors(new { customerName = "", items = new[] { Item("small") } });
        var list = await Client.GetFromJsonAsync<List<OrderDto>>("/api/orders", Json);
        Assert.Empty(list!);
    }

    [Fact]
    public async Task GetOrder_Unknown_Returns404()
    {
        var res = await Client.GetAsync("/api/orders/999999");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task UnknownApiRoute_Returns404Json()
    {
        var res = await Client.GetAsync("/api/nope");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/kitchen")]
    [InlineData("/js/order.js")]
    [InlineData("/js/kitchen.js")]
    [InlineData("/css/site.css")]
    public async Task StaticFiles_RequireRevalidation(string path)
    {
        // Without this, browsers cache old scripts heuristically and miss updates.
        var res = await Client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.True(res.Headers.CacheControl?.NoCache, $"{path} should send Cache-Control: no-cache");
    }

    [Theory]
    [InlineData("/", "Neighborhood Pizza")]
    [InlineData("/kitchen", "Kitchen orders")]
    public async Task Pages_AreServed(string path, string expectedText)
    {
        var res = await Client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        Assert.Contains(expectedText, await res.Content.ReadAsStringAsync());
    }
}
