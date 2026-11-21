using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace CeramicaCanelas.Persistence;
// Creating migration artifacts does not require a live database.
public sealed class PaymentsDesignTimeContextFactory : IDesignTimeDbContextFactory<DefaultContext>
{
    public DefaultContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<DefaultContext>()
        .UseNpgsql(Environment.GetEnvironmentVariable("POSTGRESQL_CONN") ?? "Host=localhost;Database=ceramica_design;Username=design;Password=design")
        .Options);
}
