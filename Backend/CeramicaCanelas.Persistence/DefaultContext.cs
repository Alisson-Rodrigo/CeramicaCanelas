using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Almoxarifado;
using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Entities.Payments;
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
    public DbSet<ProofImage> ProofImages { get; set; } = null!; // ?? ADICIONE ESTA LINHA


    // Vendas
    public DbSet<SalePayment> SalePayments { get; set; } = null!;
    public DbSet<Sale> Sales { get; set; } = null!;
    public DbSet<SaleItem> SaleItems { get; set; } = null!;
    public DbSet<PaymentPerson> PaymentPeople { get; set; } = null!;
    public DbSet<PaymentRuleConfiguration> PaymentRuleConfigurations { get; set; } = null!;
    public DbSet<Voucher> PaymentVouchers { get; set; } = null!;
    public DbSet<VoucherCompetence> PaymentVoucherCompetences { get; set; } = null!;
    public DbSet<PaymentCalculation> PaymentCalculations { get; set; } = null!;
    public DbSet<PaymentCalculationItem> PaymentCalculationItems { get; set; } = null!;
    public DbSet<SystemAuditEvent> SystemAuditEvents { get; set; } = null!;
    public DbSet<AdminNotification> AdminNotifications { get; set; } = null!;
    public DbSet<KilnFiring> KilnFirings { get; set; } = null!;
    public DbSet<KilnFiringProduct> KilnFiringProducts { get; set; } = null!;
    public DbSet<KilnFiringBurner> KilnFiringBurners { get; set; } = null!;
    public DbSet<KilnQualityCategory> KilnQualityCategories { get; set; } = null!;
    public DbSet<KilnFiringQuality> KilnFiringQualities { get; set; } = null!;

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

        builder.Entity<SystemAuditEvent>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Category).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Action).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Outcome).HasMaxLength(24).IsRequired();
            entity.Property(x => x.Severity).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Module).HasMaxLength(80).IsRequired();
            entity.Property(x => x.ResourceType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ActorUserId).HasMaxLength(450);
            entity.Property(x => x.ActorDisplayName).HasMaxLength(160);
            entity.Property(x => x.IpAddress).HasMaxLength(45);
            entity.Property(x => x.HttpMethod).HasMaxLength(10);
            entity.Property(x => x.Route).HasMaxLength(300);
            entity.Property(x => x.TraceId).HasMaxLength(64);
            entity.Property(x => x.TechnicalContext).HasMaxLength(300);
            entity.HasIndex(x => x.OccurredAtUtc);
            entity.HasIndex(x => new { x.Category, x.OccurredAtUtc });
            entity.HasIndex(x => new { x.ActorUserId, x.OccurredAtUtc });
            entity.HasIndex(x => new { x.Module, x.OccurredAtUtc });
            entity.HasIndex(x => new { x.Action, x.OccurredAtUtc });
        });

        builder.Entity<AdminNotification>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RecipientUserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.Priority).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Message).HasMaxLength(300).IsRequired();
            entity.Property(x => x.Origin).HasMaxLength(100).IsRequired();
            entity.HasOne<SystemAuditEvent>().WithMany().HasForeignKey(x => x.AuditEventId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.RecipientUserId, x.ReadAtUtc, x.CreatedOn });
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

        builder.Entity<KilnFiring>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.KilnName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.RegisteredByUserId).HasMaxLength(450).IsRequired();
            entity.Property(x => x.RegisteredByName).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.DifferenceJustification).HasMaxLength(1000);
            entity.HasIndex(x => x.StartedAtUtc);
            entity.HasIndex(x => new { x.KilnName, x.StartedAtUtc });
            entity.HasMany(x => x.Products).WithOne(x => x.Firing).HasForeignKey(x => x.FiringId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(x => x.Burners).WithOne(x => x.Firing).HasForeignKey(x => x.FiringId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(x => x.Quality).WithOne(x => x.Firing).HasForeignKey(x => x.FiringId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<KilnFiringProduct>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProductNameSnapshot).HasMaxLength(160).IsRequired();
            entity.Property(x => x.ProductType).HasConversion<int>();
            entity.HasIndex(x => new { x.ProductType, x.FiringId }).IsUnique();
        });
        builder.Entity<KilnFiringBurner>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.EmployeeNameSnapshot).HasMaxLength(160).IsRequired();
            entity.HasIndex(x => new { x.EmployeeId, x.FiringId }).IsUnique();
            entity.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<KilnQualityCategory>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(80).IsRequired();
            entity.HasIndex(x => x.Name).IsUnique();
        });
        builder.Entity<KilnFiringQuality>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProductType).HasConversion<int>();
            entity.Property(x => x.CategoryNameSnapshot).HasMaxLength(80).IsRequired();
            entity.HasIndex(x => new { x.FiringId, x.ProductType, x.CategoryId }).IsUnique();
            entity.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
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

            // Garante que a URL e o nome do arquivo sejam obrigat�rios
            entity.Property(p => p.FileUrl).IsRequired();
            entity.Property(p => p.OriginalFileName).IsRequired();

            // Define o relacionamento com Launch
            entity.HasOne(p => p.Launch)              // Um ProofImage tem um Launch
                  .WithMany(l => l.ImageProofs)       // Um Launch tem muitos ImageProofs (a cole��o na classe Launch)
                  .HasForeignKey(p => p.LaunchId)     // A chave estrangeira � LaunchId em ProofImage
                  .OnDelete(DeleteBehavior.Cascade);  // Se o Launch for deletado, seus comprovantes tamb�m s�o
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
                  .WithOne(i => i.Sale) // ?? define a navega��o inversa
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

            // ?? Define a rela��o corretamente
            entity.HasOne(i => i.Sale)
                  .WithMany(s => s.Items)
                  .HasForeignKey(i => i.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);

            // ?? Adiciona filtro alinhado com o filtro global de Sale
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

            // ?? Alinhado com filtro de Sale para evitar warning
            entity.HasQueryFilter(p => p.Sale.IsActive);
        });

        base.OnModelCreating(builder);
        // Preserve the Identity key lengths already used by the database migrations.
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<string>>().Property(x => x.LoginProvider).HasMaxLength(128);
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<string>>().Property(x => x.ProviderKey).HasMaxLength(128);
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<string>>().Property(x => x.LoginProvider).HasMaxLength(128);
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<string>>().Property(x => x.Name).HasMaxLength(128);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PreventAuditMutation();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        PreventAuditMutation();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void PreventAuditMutation()
    {
        if (ChangeTracker.Entries<SystemAuditEvent>().Any(e => e.State != EntityState.Added && e.State != EntityState.Unchanged)
            || ChangeTracker.Entries<AdminNotification>().Any(e => e.State == EntityState.Deleted || e.State == EntityState.Modified && e.Property(x => x.ReadAtUtc).IsModified == false))
            throw new InvalidOperationException("Registros de auditoria são imutáveis; notificações só permitem atualização de leitura.");
        foreach (var entry in ChangeTracker.Entries<AdminNotification>().Where(e => e.State == EntityState.Modified))
        {
            var changed = entry.Properties.Where(p => p.IsModified).Select(p => p.Metadata.Name).ToArray();
            if (changed.Any(name => name != nameof(AdminNotification.ReadAtUtc) && name != nameof(AdminNotification.ModifiedOn)))
                throw new InvalidOperationException("Somente o estado de leitura da notificação pode ser alterado.");
        }
    }
}
