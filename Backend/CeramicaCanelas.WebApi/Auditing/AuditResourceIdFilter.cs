using System.Reflection;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CeramicaCanelas.WebApi.Auditing;

public sealed class AuditResourceIdFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var id = context.RouteData.Values.FirstOrDefault(x => x.Key.Equals("id", StringComparison.OrdinalIgnoreCase) || x.Key.EndsWith("Id", StringComparison.OrdinalIgnoreCase)).Value?.ToString();
        id ??= context.ActionArguments.Values.Select(ReadId).FirstOrDefault(value => value is not null);
        if (id is not null) context.HttpContext.Items["AuditResourceId"] = id;

        var executed = await next();
        if (context.HttpContext.Items.ContainsKey("AuditResourceId") || executed.Exception is not null) return;
        if (executed.Result is Microsoft.AspNetCore.Mvc.ObjectResult result)
        {
            id = ReadId(result.Value);
            if (id is not null) context.HttpContext.Items["AuditResourceId"] = id;
        }
    }

    public static string? ReadId(object? value)
    {
        if (value is null) return null;
        var property = value.GetType().GetProperty("Id", BindingFlags.Instance | BindingFlags.Public | BindingFlags.IgnoreCase);
        var id = property?.GetValue(value);
        return id switch
        {
            Guid guid when guid != Guid.Empty => guid.ToString(),
            string text when !string.IsNullOrWhiteSpace(text) && text.Length <= 100 => text,
            int number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
            long number => number.ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => null
        };
    }
}
