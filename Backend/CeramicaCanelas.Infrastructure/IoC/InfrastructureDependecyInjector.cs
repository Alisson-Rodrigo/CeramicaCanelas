using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Infrastructure;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Services.Reports;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Infrastructure.Abstractions;
using CeramicaCanelas.Infrastructure.Reports;
using CeramicaCanelas.Persistence;
using CeramicaCanelas.Persistence.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CeramicaCanelas.Infrastructure.IoC;

public static class InfrastructureDependecyInjector {
    /// <summary>
    /// Inject the dependencies of the Infrastructure layer into an
    /// <see cref="IServiceCollection"/>
    /// </summary>
    /// <param name="services">
    /// The <see cref="IServiceCollection"/> to inject the dependencies into
    /// </param>
    /// <returns>
    /// The <see cref="IServiceCollection"/> with dependencies injected
    /// </returns>
    public static IServiceCollection InjectInfrastructureDependencies(this IServiceCollection services) {
        services.AddDefaultIdentity<User>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<DefaultContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IIdentityAbstractor, IdentityAbstractor>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IEmployeesRepository, EmployeesRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IMovEntryProductsRepository, MovEntryProductsRepository>();
        services.AddScoped<IMovExitProductsRepository, MovExitProductsRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<ILaunchRepository, LaunchRepository>();
        services.AddScoped<ILaunchCategoryRepository, LaunchCategoryRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ISalesRepository, SalesRepository>();
        services.AddScoped<IExtractRepository, ExtractRepository>();
        services.AddScoped<IPdfReportService, PdfReportService>();
        services.AddScoped<ILaunchCategoryGroupRepository, LaunchCategoryGroupRepository>();



        return services;
    }
}
