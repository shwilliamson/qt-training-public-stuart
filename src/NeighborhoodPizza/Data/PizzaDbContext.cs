using Microsoft.EntityFrameworkCore;

namespace NeighborhoodPizza.Data;

public class PizzaDbContext(DbContextOptions<PizzaDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(e =>
        {
            e.HasIndex(o => o.OrderNumber).IsUnique();
            e.Property(o => o.CustomerName).HasMaxLength(Menu.MaxNameLength).IsRequired();
            e.Property(o => o.Status).HasConversion<string>().HasMaxLength(16);
            e.HasMany(o => o.Lines).WithOne().HasForeignKey(l => l.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderLine>(e =>
        {
            e.Property(l => l.Size).HasMaxLength(32).IsRequired();
            e.Property(l => l.Instructions).HasMaxLength(Menu.MaxInstructionsLength);
            e.HasMany(l => l.Toppings).WithOne().HasForeignKey(t => t.OrderLineId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderLineTopping>(e => e.Property(t => t.ToppingId).HasMaxLength(32).IsRequired());
    }
}
