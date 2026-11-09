using System.Net;
using System.Net.Http.Json;
using NeighborhoodPizza.Endpoints;
using static NeighborhoodPizza.Tests.TestHost;

namespace NeighborhoodPizza.Tests;

// AC-3.3, AC-4.1, AC-4.2
public class KitchenApiTests : IDisposable
{
    private readonly TestHost _host = new();
    private HttpClient Client => _host.Client;

    public void Dispose() => _host.Dispose();

    private Task<List<OrderDto>?> ListAsync(string query = "") =>
        Client.GetFromJsonAsync<List<OrderDto>>("/api/orders" + query, Json);

    private Task<HttpResponseMessage> MarkReadyAsync(int number) =>
        Client.PostAsync($"/api/orders/{number}/ready", null);

    [Fact]
    public async Task SubmittedOrder_AppearsInKitchenListAsNew()
    {
        var submitted = await _host.SubmitAsync("Jordan", Item("small", 1, "pepperoni"));

        var listed = Assert.Single((await ListAsync())!);
        Assert.Equal(submitted.OrderNumber, listed.OrderNumber);
        Assert.Equal("New", listed.Status);
        Assert.Null(listed.ReadyAt);
    }

    [Fact]
    public async Task List_IncludesNameNumberItemsTotal()
    {
        var submitted = await _host.SubmitAsync("Riley", Item("large", 2, "mushrooms", "green-peppers"), Item("small"));

        var o = Assert.Single((await ListAsync())!);
        Assert.Equal(submitted.OrderNumber, o.OrderNumber);
        Assert.Equal("Riley", o.CustomerName);
        Assert.Equal(2, o.Items.Count);
        Assert.Equal("Large pizza (14\")", o.Items[0].SizeName);
        Assert.Equal(2, o.Items[0].Quantity);
        Assert.Equal(["Mushrooms", "Green peppers"], o.Items[0].Toppings.Select(t => t.Name));
        Assert.Equal("Small pizza (10\")", o.Items[1].SizeName);
        Assert.Empty(o.Items[1].Toppings);
        Assert.Equal(2 * 1800 + 1000, o.TotalCents);
    }

    [Fact]
    public async Task MarkReady_ChangesStatus()
    {
        var o = await _host.SubmitAsync("Casey", Item("small"));

        var res = await MarkReadyAsync(o.OrderNumber);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var updated = (await res.Content.ReadFromJsonAsync<OrderDto>(Json))!;
        Assert.Equal("Ready", updated.Status);
        Assert.NotNull(updated.ReadyAt);

        var listed = Assert.Single((await ListAsync())!);
        Assert.Equal("Ready", listed.Status);
    }

    [Fact]
    public async Task MarkReady_IsIdempotent()
    {
        var o = await _host.SubmitAsync("Casey", Item("small"));
        var first = (await (await MarkReadyAsync(o.OrderNumber)).Content.ReadFromJsonAsync<OrderDto>(Json))!;

        var res = await MarkReadyAsync(o.OrderNumber);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var second = (await res.Content.ReadFromJsonAsync<OrderDto>(Json))!;
        Assert.Equal("Ready", second.Status);
        Assert.Equal(first.ReadyAt, second.ReadyAt);
    }

    [Fact]
    public async Task MarkReady_Unknown404()
    {
        var res = await MarkReadyAsync(424242);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task List_SortsNewOldestFirst_ThenReadyMostRecentFirst()
    {
        var a = await _host.SubmitAsync("A", Item("small"));
        var b = await _host.SubmitAsync("B", Item("small"));
        var c = await _host.SubmitAsync("C", Item("small"));
        var d = await _host.SubmitAsync("D", Item("small"));

        await MarkReadyAsync(a.OrderNumber);
        await Task.Delay(20);
        await MarkReadyAsync(c.OrderNumber);

        var list = (await ListAsync())!;
        Assert.Equal(
            [b.OrderNumber, d.OrderNumber, c.OrderNumber, a.OrderNumber],
            list.Select(o => o.OrderNumber));
        Assert.Equal(["New", "New", "Ready", "Ready"], list.Select(o => o.Status));
    }

    [Fact]
    public async Task List_FiltersByStatus()
    {
        var a = await _host.SubmitAsync("A", Item("small"));
        var b = await _host.SubmitAsync("B", Item("small"));
        await MarkReadyAsync(a.OrderNumber);

        Assert.Equal([b.OrderNumber], (await ListAsync("?status=New"))!.Select(o => o.OrderNumber));
        Assert.Equal([a.OrderNumber], (await ListAsync("?status=ready"))!.Select(o => o.OrderNumber));

        var bad = await Client.GetAsync("/api/orders?status=Cooking");
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }
}
