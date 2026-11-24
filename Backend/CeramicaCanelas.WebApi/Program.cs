using CeramicaCanelas.Application;
using CeramicaCanelas.Application.IoC;
using CeramicaCanelas.Application.Services.Reports;
using CeramicaCanelas.Infrastructure.IoC;
using CeramicaCanelas.Persistence.IoC;
using CeramicaCanelas.WebApi.Middleware;
using CeramicaCanelas.WebApi.Monitoring;
using CeramicaCanelas.WebApi.Assistant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

namespace CeramicaCanelas.WebApi;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddScoped<CeramicaCanelas.WebApi.Auditing.AuditResourceIdFilter>();
        builder.Services.AddControllers(options => options.Filters.AddService<CeramicaCanelas.WebApi.Auditing.AuditResourceIdFilter>());
        builder.Services.AddEndpointsApiExplorer();
        // Configure Swagger with JWT support
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "Ceramica Canelas API", Version = "v1" });

            c.MapType<DateOnly>(() => new OpenApiSchema
            {
                Type = "string",
                Format = "date"
            });

            c.MapType<DateOnly?>(() => new OpenApiSchema
            {
                Type = "string",
                Format = "date"
            });


            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme.\r\n\r\n" +
                              "Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\n" +
                              "Example: 'Bearer 12345abcdef'",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement()
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        },
                        Scheme = "oauth2",
                        Name = "Bearer",
                        In = ParameterLocation.Header,
                    },
                    new List<string>()
                }
            });
        });

        builder.WebHost.ConfigureKestrel(serverOptions =>
        {
            serverOptions.Limits.MaxRequestBodySize = 20971520; // 20 MB em bytes (20 * 1024 * 1024)
        });

        builder.Services.Configure<CompanyProfile>(
            builder.Configuration.GetSection("CompanyProfile"));




        //Adicionando Cors para integrações
  builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", policy =>
    {
        var allowedOrigins = new HashSet<string>
        {
            "http://localhost:3000",
            "http://localhost:5236",
            "https://localhost:7018",
            "https://ceramicacanelas.shop",
            "https://www.ceramicacanelas.shop",
            "http://ceramicacanelas.shop",
            "https://ceramisys.shop",
            "https://www.ceramisys.shop",
            "https://cjmcanelas.shop",
            "https://www.cjmcanelas.shop"
        };

        policy.SetIsOriginAllowed(origin => allowedOrigins.Contains(origin.TrimEnd('.')))
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

        // JWT Configuration
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
        var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER");
        var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE");


        if (string.IsNullOrEmpty(jwtSecret) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
        {
            throw new Exception("Variáveis de ambiente JWT não configuradas corretamente.");
        }

        var key = Encoding.ASCII.GetBytes(jwtSecret);



        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = ClaimTypes.Role
            };

            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                    logger.LogWarning("JWT authentication failed. TraceId={TraceId} ExceptionType={ExceptionType}", context.HttpContext.TraceIdentifier, context.Exception.GetType().Name);
                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    // Custom validation logic if needed
                    return Task.CompletedTask;
                }
            };
        });

        // Authorization Policies
        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireRole("Admin"));

            options.AddPolicy("UserOnly", policy =>
                policy.RequireRole("User"));
            options.AddPolicy("CustomerOnly", policy =>
                policy.RequireRole("Customer"));
        });
        builder.Services
            .InjectPersistenceDependencies(builder.Configuration)
            .InjectInfrastructureDependencies()
            .InjectApplicationDependencies();
        builder.Services.AddSingleton<CeramicaCanelas.WebApi.Auditing.IAuditEventWriter, CeramicaCanelas.WebApi.Auditing.AuditEventWriter>();
        builder.Services.AddHostedService<CeramicaCanelas.WebApi.Auditing.AuditRetentionService>();
        builder.Services.AddOptions<ServerStatusOptions>()
            .BindConfiguration(ServerStatusOptions.Section)
            .Validate(options => options.SampleIntervalSeconds is >= 1 and <= 300 &&
                options.BackupStaleAfterHours is >= 1 and <= 168 &&
                options.BackupRunningStaleAfterHours is >= 1 and <= 168, "Intervalos inválidos para o status do servidor.")
            .ValidateOnStart();
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<IHostMetricsProvider>(_ =>
            OperatingSystem.IsLinux() ? new LinuxHostMetrics() :
            OperatingSystem.IsWindows() ? new WindowsHostMetrics() : new UnavailableHostMetrics());
        builder.Services.AddSingleton<HostMetricsCollector>();
        builder.Services.AddHostedService(services => services.GetRequiredService<HostMetricsCollector>());
        builder.Services.AddSingleton<BackupStatusReader>();
        builder.Services.AddHttpClient<IAssistantChatService, AssistantChatService>(client => client.Timeout = TimeSpan.FromSeconds(45));
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("assistant", context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 12, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
        });


        // Add Mediatr to program
        builder.Services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblies(
                typeof(ApplicationLayer).Assembly,
                typeof(Program).Assembly
            );
        });

        var app = builder.Build();

        app.UseForwardedHeaders(CeramicaCanelas.WebApi.Auditing.TrustedForwardedHeadersOptions.Create(builder.Configuration));

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseStaticFiles();

        app.UseCors("AllowSpecificOrigin");

        app.UseMiddleware<CustomExceptionMiddleware>();
        app.UseMiddleware<AuditCaptureMiddleware>();

        app.UseHttpsRedirection();

        app.UseAuthentication();
        app.UseRateLimiter();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
