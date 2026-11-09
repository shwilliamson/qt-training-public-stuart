namespace NeighborhoodPizza.Endpoints;

public static class MenuEndpoints
{
    public static void MapMenuEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/menu", () => new { sizes = Menu.Sizes, toppings = Menu.Toppings });
    }
}
