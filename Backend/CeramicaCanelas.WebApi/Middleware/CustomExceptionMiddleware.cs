using CeramicaCanelas.Domain.Exception;
using System.Net;
using System.Security.Claims;
using CeramicaCanelas.WebApi.Auditing;

namespace CeramicaCanelas.WebApi.Middleware
{
    public class CustomExceptionMiddleware
    {
        private readonly RequestDelegate _next;

        public CustomExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (ApiException ex)
            {
                context.Response.StatusCode = (int)ex.StatusCode;
                context.Response.ContentType = "application/json";

                var result = new
                {
                    message = ex.Message
                };

                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(result));
            }
            catch (KeyNotFoundException ex)
            {
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new { message = ex.Message }));
            }
            catch (InvalidOperationException ex)
            {
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new { message = ex.Message }));
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                context.Response.ContentType = "application/json";

                var logger = context.RequestServices.GetService<ILogger<CustomExceptionMiddleware>>();
                logger?.LogError("Unhandled API exception. TraceId={TraceId} ExceptionType={ExceptionType}", context.TraceIdentifier, ex.GetType().Name);
                var auditWriter = context.RequestServices.GetService<IAuditEventWriter>();
                var endpoint = context.GetEndpoint()?.Metadata.GetMetadata<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>();
                var routeResource = context.Request.RouteValues.FirstOrDefault(x => x.Key.Equals("id", StringComparison.OrdinalIgnoreCase) || x.Key.EndsWith("Id", StringComparison.OrdinalIgnoreCase)).Value?.ToString()
                    ?? context.Items["AuditResourceId"]?.ToString();
                if (auditWriter is not null) await auditWriter.WriteAsync(new AuditEventData("TechnicalDiagnostic", endpoint?.ActionName ?? context.Request.Method,
                    "Failure", "Critical", endpoint?.ControllerName ?? "API", endpoint?.ControllerName ?? "Endpoint", routeResource,
                    context.User.FindFirstValue(ClaimTypes.NameIdentifier), context.User.FindFirstValue(ClaimTypes.Name), DateTime.UtcNow,
                    context.Connection.RemoteIpAddress?.ToString(), context.Request.Method, endpoint?.AttributeRouteInfo?.Template,
                    (int)HttpStatusCode.InternalServerError, context.TraceIdentifier, ex.GetType().Name), context.RequestAborted);
                context.Items["AuditExceptionWritten"] = true;


                var result = new
                {
                    message = "Ocorreu um erro inesperado."
                };

                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(result));
            }
        }
    }
}

