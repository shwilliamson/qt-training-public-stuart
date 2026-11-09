using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NeighborhoodPizza.Data;
using NeighborhoodPizza.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Resolve the connection string lazily so test hosts can override it.
// A relative SQLite path is resolved against the content root, not the shell's working directory.
builder.Services.AddDbContext<PizzaDbContext>((sp, options) =>
{
    var csb = new SqliteConnectionStringBuilder(
        sp.GetRequiredService<IConfiguration>().GetConnectionString("Pizza") ?? "Data Source=App_Data/pizza.db");
    if (!Path.IsPathRooted(csb.DataSource) && csb.DataSource != ":memory:")
        csb.DataSource = Path.Combine(sp.GetRequiredService<IWebHostEnvironment>().ContentRootPath, csb.DataSource);
    options.UseSqlite(csb.ToString());
});
builder.Services.AddProblemDetails();

var app = builder.Build();

InitializeDatabase(app);

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapMenuEndpoints();
app.MapOrderEndpoints();

app.MapGet("/kitchen", (IWebHostEnvironment env) =>
    Results.File(Path.Combine(env.WebRootPath, "kitchen.html"), "text/html; charset=utf-8"));

// Unknown API routes return a JSON 404 rather than falling through to static files.
app.Map("/api/{**rest}", () =>
    Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Not found"));

app.Run();

static void InitializeDatabase(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PizzaDbContext>();

    // Make sure the folder for the SQLite file exists (e.g. App_Data/).
    var dataSource = new SqliteConnectionStringBuilder(db.Database.GetConnectionString()).DataSource;
    var dir = Path.GetDirectoryName(Path.GetFullPath(dataSource));
    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

    db.Database.Migrate();
}

public partial class Program;
