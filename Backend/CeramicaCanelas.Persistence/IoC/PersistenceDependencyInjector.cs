using CeramicaCanelas.Persistence.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CeramicaCanelas.Persistence.IoC;

public static class PersistenceDependencyInjector
{
    public static IServiceCollection InjectPersistenceDependencies(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<UtcDateInterceptor>(); // ⬅️ Registra o interceptor

        services.AddDbContext<DefaultContext>((serviceProvider, options) =>
        {
            var interceptor = serviceProvider.GetRequiredService<UtcDateInterceptor>();
            var connectionString = Environment.GetEnvironmentVariable("POSTGRESQL_CONN")
                ?? configuration.GetConnectionString("PostgreSQL");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "A conexão PostgreSQL não foi configurada. Defina POSTGRESQL_CONN ou ConnectionStrings:PostgreSQL.");
            }

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(interceptor); // ⬅️ Adiciona o interceptor
        });

        return services;
    }
}
