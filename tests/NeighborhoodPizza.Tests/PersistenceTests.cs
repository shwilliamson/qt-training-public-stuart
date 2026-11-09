using System.Net.Http.Json;
using NeighborhoodPizza.Endpoints;
using static NeighborhoodPizza.Tests.TestHost;

namespace NeighborhoodPizza.Tests;

// AC-4.3: orders and statuses survive the app being closed and reopened.
public class PersistenceTests : IDisposable
{
    private readonly TestHost _host = new();

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task OrdersAndStatuses_SurviveHostRestart()
    {
        var first = await _host.SubmitAsync("Before Restart 1", Item("large", 2, "pepperoni"));
        var second = await _host.SubmitAsync("Before Restart 2", Item("small"));
        await _host.Client.PostAsync($"/api/orders/{first.OrderNumber}/ready", null);
        var before = await _host.Client.GetFromJsonAsync<List<OrderDto>>("/api/orders", Json);

        _host.Restart();

        var after = (await _host.Client.GetFromJsonAsync<List<OrderDto>>("/api/orders", Json))!;
        Assert.Equal(2, after.Count);
        Assert.Equal(before!.Select(o => (o.OrderNumber, o.Status, o.CustomerName, o.TotalCents, o.ReadyAt)),
                     after.Select(o => (o.OrderNumber, o.Status, o.CustomerName, o.TotalCents, o.ReadyAt)));
        Assert.Equal("Ready", after.Single(o => o.OrderNumber == first.OrderNumber).Status);
        Assert.Equal("New", after.Single(o => o.OrderNumber == second.OrderNumber).Status);
        Assert.Equal(["Pepperoni"], after.Single(o => o.OrderNumber == first.OrderNumber).Items[0].Toppings.Select(t => t.Name));
    }

    [Fact]
    public async Task OrderNumbers_ContinueAfterRestart()
    {
        await _host.SubmitAsync("A", Item("small"));
        var last = await _host.SubmitAsync("B", Item("small"));

        _host.Restart();

        var next = await _host.SubmitAsync("C", Item("small"));
        Assert.Equal(last.OrderNumber + 1, next.OrderNumber);
    }

    [Fact]
    public async Task StatusChangeAfterRestart_IsAlsoPersisted()
    {
        var o = await _host.SubmitAsync("A", Item("small"));
        _host.Restart();
        await _host.Client.PostAsync($"/api/orders/{o.OrderNumber}/ready", null);
        _host.Restart();

        var reloaded = await _host.Client.GetFromJsonAsync<OrderDto>($"/api/orders/{o.OrderNumber}", Json);
        Assert.Equal("Ready", reloaded!.Status);
    }
}
