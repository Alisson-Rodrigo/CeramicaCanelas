using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Almoxarifado;
using CeramicaCanelas.Domain.Entities.Financial;

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

    // ---PARA O LIVRO CAIXA ---
    public DbSet<Launch> Launches { get; set; } = null!;
    public DbSet<LaunchCategory> LaunchCategories { get; set; } = null!;
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Extract> Extracts { get; set; } = null!;

    // Vendas
    public DbSet<Sale> Sales { get; set; } = null!;
    public DbSet<SaleItem> SaleItems { get; set; } = null!;


    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasPostgresExtension("uuid-ossp");
        builder.ApplyConfigurationsFromAssembly(typeof(DefaultContext).Assembly);

        // User
        builder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        // Products
        builder.Entity<Products>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.HasOne(p => p.Category)
                  .WithMany(c => c.Products)
                  .HasForeignKey(p => p.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull); // mantém produtos mesmo sem categoria
        });

        // Categories
        builder.Entity<Categories>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        // Employees
        builder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        // ProductEntry
        builder.Entity<ProductEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");

            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.SetNull); // mantém entrada mesmo se produto for deletado

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.SetNull); // mantém entrada mesmo se user for deletado

            entity.HasOne(e => e.Supplier)
                  .WithMany(s => s.ProductEntries)
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ProductExit
        builder.Entity<ProductExit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");

            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.SetNull); // mantém saída mesmo sem produto

            entity.HasOne(e => e.Employee)
                  .WithMany()
                  .HasForeignKey(e => e.EmployeeId)
                  .OnDelete(DeleteBehavior.SetNull); // mantém saída mesmo sem funcionário

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Supplier
        builder.Entity<Supplier>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(s => s.Name).IsRequired().HasMaxLength(100);
        });

        // --- INÍCIO DAS NOVAS CONFIGURAÇÕES ---

        // Extract
        builder.Entity<Extract>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("uuid_generate_v4()");

            // Mapear o DateOnly para o PostgreSQL
            entity.Property(e => e.Date)
                  .HasColumnType("date")
                  .HasConversion(
                      v => v.ToDateTime(TimeOnly.MinValue),
                      v => DateOnly.FromDateTime(v)
                  );

            entity.Property(e => e.Value).HasPrecision(18, 2);
            entity.Property(e => e.Observations).HasMaxLength(255);

            // Soft-delete
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            // Filtro global: sempre retorna só ativos
            entity.HasQueryFilter(e => e.IsActive);
        });


        // Launch
        builder.Entity<Launch>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasDefaultValueSql("uuid_generate_v4()");

            // Relacionamento com LaunchCategory
            // Se a categoria for "deletada", o campo CategoryId no lançamento vira nulo
            entity.HasOne(l => l.Category)
                  .WithMany() // Categoria não tem uma lista de Lançamentos
                  .HasForeignKey(l => l.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Relacionamento com Customer
            // Se o cliente for "deletado", o campo CustomerId no lançamento vira nulo
            entity.HasOne(l => l.Customer)
                  .WithMany(c => c.Launches)
                  .HasForeignKey(l => l.CustomerId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // LaunchCategory
        builder.Entity<LaunchCategory>(entity =>
        {
            entity.HasKey(lc => lc.Id);
            entity.Property(lc => lc.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        // Customer
        builder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasDefaultValueSql("uuid_generate_v4()");
        });

        // ================= VENDAS =================
        builder.Entity<Sale>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasDefaultValueSql("uuid_generate_v4()");

            // Soft-delete: default TRUE no banco
            entity.Property(s => s.IsActive).HasDefaultValue(true);

            // Índice único para NoteNumber apenas quando ativo (partial unique index)
            // Npgsql: use HasFilter com expressão booleana do PostgreSQL
            entity.HasIndex(s => s.NoteNumber)
                  .IsUnique()
                  .HasFilter("\"IsActive\" = TRUE");

            // Campos de texto
            entity.Property(s => s.City).HasMaxLength(80);
            entity.Property(s => s.State).HasMaxLength(2);
            entity.Property(s => s.CustomerName).HasMaxLength(120);
            entity.Property(s => s.CustomerAddress).HasMaxLength(200);
            entity.Property(s => s.CustomerPhone).HasMaxLength(30);

            // Precisões monetárias
            entity.Property(s => s.TotalGross).HasPrecision(18, 2);
            entity.Property(s => s.TotalNet).HasPrecision(18, 2);
            entity.Property(s => s.Discount).HasPrecision(18, 2);

            // Relacionamento 1:N Sale -> SaleItem (cascade ao deletar de fato)
            entity.HasMany(s => s.Items)
                  .WithOne()
                  .HasForeignKey(i => i.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Índice por data
            entity.HasIndex(s => s.Date);

            // Filtro global: por padrão só traz vendas ativas
            entity.HasQueryFilter(s => s.IsActive);
        });

        builder.Entity<SaleItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Id).HasDefaultValueSql("uuid_generate_v4()");

            // Precisões
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
            entity.Property(i => i.Quantity).HasPrecision(18, 3);

            // Enum de produto (ProductType) como int (padrão); se preferir string, troque para .HasConversion<string>()
            entity.Property(i => i.Product).HasConversion<int>();

            entity.HasIndex(i => i.SaleId);
        });


        // --- FIM DAS NOVAS CONFIGURAÇÕES ---



        base.OnModelCreating(builder);
    }
}
