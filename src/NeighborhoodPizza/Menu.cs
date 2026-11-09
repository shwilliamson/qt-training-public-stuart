namespace NeighborhoodPizza;

public sealed record MenuItem(string Id, string Name, int PriceCents);

/// <summary>The fixed menu. Single source of truth for names and prices.</summary>
public static class Menu
{
    public static readonly IReadOnlyList<MenuItem> Sizes =
    [
        new("small", "Small pizza (10\")", 1000),
        new("large", "Large pizza (14\")", 1400),
    ];

    public static readonly IReadOnlyList<MenuItem> Toppings =
    [
        new("pepperoni", "Pepperoni", 200),
        new("mushrooms", "Mushrooms", 200),
        new("onions", "Onions", 200),
        new("green-peppers", "Green peppers", 200),
    ];

    public const int MinQuantity = 1;
    public const int MaxQuantity = 20;
    public const int MaxNameLength = 50;

    public static MenuItem? FindSize(string? id) => Sizes.FirstOrDefault(s => s.Id == id);
    public static MenuItem? FindTopping(string? id) => Toppings.FirstOrDefault(t => t.Id == id);
}
