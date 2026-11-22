namespace CeramicaCanelas.WebApi.Auditing;

public static class AuditQueryRules
{
    public static bool IsValid(DateTime? fromUtc, DateTime? toUtc, string? text, string? module, string? action, int page, int pageSize) =>
        page >= 1 && pageSize is >= 1 and <= 100 && !(fromUtc.HasValue && toUtc.HasValue && fromUtc.Value > toUtc.Value)
        && (text is null || text.Length <= 100) && (module is null || module.Length <= 80) && (action is null || action.Length <= 120);
}
