using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using NeighborhoodPizza.Endpoints;

namespace NeighborhoodPizza.Tests;

/// <summary>A test host backed by its own SQLite file. Reopen the same file with <see cref="Restart"/>.</summary>
public sealed class TestHost : IDisposable
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private WebApplicationFactory<Program> _factory;
    private readonly bool _ownsFile;

    public string DbPath { get; }
    public HttpClient Client { get; private set; }

    public TestHost(string? dbPath = null)
    {
        _ownsFile = dbPath is null;
        DbPath = dbPath ?? Path.Combine(Path.GetTempPath(), $"np-test-{Guid.NewGuid():N}.db");
        _factory = Create(DbPath);
        Client = _factory.CreateClient();
    }

    private static WebApplicationFactory<Program> Create(string dbPath) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            b.UseSetting("ConnectionStrings:Pizza", $"Data Source={dbPath}"));

    /// <summary>Shut the app down completely, then start a fresh one on the same database file.</summary>
    public void Restart()
    {
        Client.Dispose();
        _factory.Dispose();
        SqliteConnection.ClearAllPools();
        _factory = Create(DbPath);
        Client = _factory.CreateClient();
    }

    public async Task<OrderDto> SubmitAsync(string name, params object[] items)
    {
        var res = await Client.PostAsJsonAsync("/api/orders", new { customerName = name, items });
        Assert.Equal(System.Net.HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<OrderDto>(Json))!;
    }

    public static object Item(string size, int quantity = 1, params string[] toppings) =>
        new { size, toppings, quantity };

    public void Dispose()
    {
        Client.Dispose();
        _factory.Dispose();
        SqliteConnection.ClearAllPools();
        if (_ownsFile)
        {
            foreach (var f in new[] { DbPath, DbPath + "-wal", DbPath + "-shm" })
                if (File.Exists(f)) File.Delete(f);
        }
    }
}
