namespace NeighborhoodPizza.Tests;

// AC-1.1, AC-1.3, AC-2.2, AC-2.3
public class PricingTests
{
    private static readonly string[] AllToppings = ["pepperoni", "mushrooms", "onions", "green-peppers"];

    [Theory]
    [InlineData("small", 0, 1000)]
    [InlineData("small", 1, 1200)]
    [InlineData("small", 4, 1800)]
    [InlineData("large", 0, 1400)]
    [InlineData("large", 2, 1800)]
    [InlineData("large", 4, 2200)]
    public void UnitPrice_IsSizePlusTwoDollarsPerTopping(string size, int toppingCount, int expected)
    {
        Assert.Equal(expected, Pricing.UnitPriceCents(size, AllToppings.Take(toppingCount)));
    }

    [Theory]
    [InlineData("small")]
    [InlineData("large")]
    public void UnitPrice_AddsTwoDollarsPerTopping(string size)
    {
        var previous = Pricing.UnitPriceCents(size, []);
        for (var n = 1; n <= AllToppings.Length; n++)
        {
            var current = Pricing.UnitPriceCents(size, AllToppings.Take(n));
            Assert.Equal(200, current - previous);   // adding one topping
            previous = current;
        }
        // removing one topping
        Assert.Equal(200, Pricing.UnitPriceCents(size, AllToppings) - Pricing.UnitPriceCents(size, AllToppings.Take(3)));
    }

    [Fact]
    public void UnitPrice_AnyCombinationOfToppings_IsAllowed()
    {
        // Every one of the 16 subsets of toppings, on both sizes.
        for (var mask = 0; mask < 16; mask++)
        {
            var subset = AllToppings.Where((_, i) => (mask & (1 << i)) != 0).ToArray();
            Assert.Equal(1000 + 200 * subset.Length, Pricing.UnitPriceCents("small", subset));
            Assert.Equal(1400 + 200 * subset.Length, Pricing.UnitPriceCents("large", subset));
        }
    }

    [Theory]
    [InlineData(1800, 1, 1800)]
    [InlineData(1800, 3, 5400)]
    [InlineData(1000, 20, 20000)]
    public void LineTotal_MultipliesByQuantity(int unit, int qty, int expected)
    {
        Assert.Equal(expected, Pricing.LineTotalCents(unit, qty));
    }

    [Fact]
    public void OrderTotal_SumsLineTotals()
    {
        Assert.Equal(1000 + 3600 + 2200, Pricing.OrderTotalCents([1000, 3600, 2200]));
        Assert.Equal(0, Pricing.OrderTotalCents([]));
    }

    [Fact]
    public void UnitPrice_UnknownIds_Throw()
    {
        Assert.Throws<ArgumentException>(() => Pricing.UnitPriceCents("medium", []));
        Assert.Throws<ArgumentException>(() => Pricing.UnitPriceCents("small", ["anchovies"]));
    }
}
