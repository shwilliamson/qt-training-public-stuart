namespace NeighborhoodPizza;

/// <summary>Pure price calculations, all in integer cents.</summary>
public static class Pricing
{
    /// <summary>Size price plus each topping's price. Ids must already be validated.</summary>
    public static int UnitPriceCents(string sizeId, IEnumerable<string> toppingIds)
    {
        var size = Menu.FindSize(sizeId) ?? throw new ArgumentException($"Unknown size '{sizeId}'.", nameof(sizeId));
        var toppings = toppingIds.Sum(id =>
            (Menu.FindTopping(id) ?? throw new ArgumentException($"Unknown topping '{id}'.", nameof(toppingIds))).PriceCents);
        return size.PriceCents + toppings;
    }

    public static int LineTotalCents(int unitPriceCents, int quantity) => unitPriceCents * quantity;

    public static int OrderTotalCents(IEnumerable<int> lineTotalsCents) => lineTotalsCents.Sum();
}
