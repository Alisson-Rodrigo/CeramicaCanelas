using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Almoxarifado;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Entities.Sales;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.Persistence;

public class DefaultContext : IdentityDbContext<User>
{
    public DefaultContext() { }
    public DefaultContext(DbContextOptions<DefaultContext> options) : base(options) { }

    public DbSet<Products> Products { get; set; } = null!;
    public DbSet<Categories> Categories { get; set; } = null!;
    public DbSet<Employee> Employees { get; set; } = null!;
    public DbSet<ProductExit> ProductExits { get; set; } = null!;
    public DbSet<ProductEntry> ProductEntries { get; set; } = null!;
    public DbSet<Supplier> Suppliers { get; set; } = null!;

    public DbSet<LaunchCategoryGroup> LaunchCategoryGroups { get; set; } = null!;
    public DbSet<Launch> Launches { get; set; } = null!;
    public DbSet<LaunchCategory> LaunchCategories { get; set; } = null!;
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Extract> Extracts { get; set; } = null!;
    public DbSet<ProofImage> ProofImages { get; set; } = null!; // 👈 ADICIONE ESTA LINHA


    // Vendas
    public DbSet<SalePayment> SalePayments { get; set; } = null!;
    public DbSet<Sale> Sales { get; set; } = null!;
    public DbSet<SaleItem> SaleItems { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasPostgresExtension("uuid-ossp");
        builder.ApplyConfigurationsFromAssembly(typeof(DefaultContext).Assembly);

        // ================= USERS =================
        builder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        // ================= PRODUCTS =================
        builder.Entity<Products>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.HasOne(p => p.Category)
                  .WithMany(c => c.Products)
                  .HasForeignKey(p => p.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Categories>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        builder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        builder.Entity<ProductEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.HasOne(e => e.Product).WithMany().HasForeignKey(e => e.ProductId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Supplier).WithMany(s => s.ProductEntries).HasForeignKey(e => e.SupplierId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ProductExit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.HasOne(e => e.Product).WithMany().HasForeignKey(e => e.ProductId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Employee).WithMany().HasForeignKey(e => e.EmployeeId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Supplier>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(s => s.Name).IsRequired().HasMaxLength(100);
        });

        // ================= EXTRACT =================
        builder.Entity<Extract>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(e => e.Date)
                  .HasColumnType("date")
                  .HasConversion(v => v.ToDateTime(TimeOnly.MinValue),
                                 v => DateOnly.FromDateTime(v));
            entity.Property(e => e.Value).HasPrecision(18, 2);
            entity.Property(e => e.Observations).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasQueryFilter(e => e.IsActive);
        });

        // ================= LAUNCH =================
        builder.Entity<Launch>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.HasOne(l => l.Category).WithMany().HasForeignKey(l => l.CategoryId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(l => l.Customer).WithMany(c => c.Launches).HasForeignKey(l => l.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ProofImage>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasDefaultValueSql("uuid_generate_v4()");

            // Garante que a URL e o nome do arquivo sejam obrigatórios
            entity.Property(p => p.FileUrl).IsRequired();
            entity.Property(p => p.OriginalFileName).IsRequired();

            // Define o relacionamento com Launch
            entity.HasOne(p => p.Launch)              // Um ProofImage tem um Launch
                  .WithMany(l => l.ImageProofs)       // Um Launch tem muitos ImageProofs (a coleção na classe Launch)
                  .HasForeignKey(p => p.LaunchId)     // A chave estrangeira é LaunchId em ProofImage
                  .OnDelete(DeleteBehavior.Cascade);  // Se o Launch for deletado, seus comprovantes também são
        });

        builder.Entity<LaunchCategory>(entity =>
        {
            entity.HasKey(lc => lc.Id);
            entity.Property(lc => lc.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(lc => lc.Name).IsRequired().HasMaxLength(100);
            entity.Property(lc => lc.IsDeleted).HasDefaultValue(false);
        });

        builder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        builder.Entity<LaunchCategoryGroup>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.Property(g => g.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(g => g.Name).IsRequired().HasMaxLength(100);
            entity.Property(g => g.IsDeleted).HasDefaultValue(false);
            entity.HasMany(g => g.Categories).WithOne(c => c.Group).HasForeignKey(c => c.GroupId).OnDelete(DeleteBehavior.SetNull);
        });

        // ================= SALES =================
        builder.Entity<Sale>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(s => s.IsActive).HasDefaultValue(true);

            entity.HasIndex(s => s.NoteNumber)
                  .IsUnique()
                  .HasFilter("\"IsActive\" = TRUE");

            entity.Property(s => s.City).HasMaxLength(80);
            entity.Property(s => s.State).HasMaxLength(2);
            entity.Property(s => s.CustomerName).HasMaxLength(120);
            entity.Property(s => s.CustomerAddress).HasMaxLength(200);
            entity.Property(s => s.CustomerPhone).HasMaxLength(30);

            entity.Property(s => s.TotalGross).HasPrecision(18, 2);
            entity.Property(s => s.TotalNet).HasPrecision(18, 2);
            entity.Property(s => s.Discount).HasPrecision(18, 2);

            entity.HasMany(s => s.Items)
                  .WithOne(i => i.Sale) // 🔹 define a navegação inversa
                  .HasForeignKey(i => i.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(s => s.Payments).WithOne(p => p.Sale).HasForeignKey(p => p.SaleId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(s => s.Date);
            entity.HasQueryFilter(s => s.IsActive);
        });

        builder.Entity<SaleItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
            entity.Property(i => i.Quantity).HasPrecision(18, 3);
            entity.Property(i => i.Product).HasConversion<int>();
            entity.HasIndex(i => i.SaleId);

            // 🔹 Define a relação corretamente
            entity.HasOne(i => i.Sale)
                  .WithMany(s => s.Items)
                  .HasForeignKey(i => i.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);

            // 🔹 Adiciona filtro alinhado com o filtro global de Sale
            entity.HasQueryFilter(i => i.Sale.IsActive);
        });


        builder.Entity<SalePayment>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.Property(e => e.PaymentDate)
                .HasColumnType("date")
                .HasConversion(
                    v => v.HasValue ? v.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                    v => v.HasValue ? DateOnly.FromDateTime(v.Value) : (DateOnly?)null
                );

            entity.Property(p => p.PaymentMethod).HasConversion<int>();

            entity.HasOne(p => p.Sale)
                  .WithMany(s => s.Payments)
                  .HasForeignKey(p => p.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);

            // 🔹 Alinhado com filtro de Sale para evitar warning
            entity.HasQueryFilter(p => p.Sale.IsActive);
        });

        base.OnModelCreating(builder);
    }
}
