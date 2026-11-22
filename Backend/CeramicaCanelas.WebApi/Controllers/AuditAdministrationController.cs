using System.Security.Claims;
using System.Text;
using CeramicaCanelas.Persistence;
using CeramicaCanelas.WebApi.Auditing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/admin/audit")]
[Authorize(Roles = "Admin")]
public sealed class AuditAdministrationController(DefaultContext db) : ControllerBase
{
    [HttpGet("events")]
    public async Task<IActionResult> Events([FromQuery] DateTime? fromUtc, [FromQuery] DateTime? toUtc,
        [FromQuery] string? userId, [FromQuery] string? module, [FromQuery] string? action,
        [FromQuery] string? outcome, [FromQuery] string? text, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25, CancellationToken ct = default)
    {
        if (!AuditQueryRules.IsValid(fromUtc, toUtc, text, module, action, page, pageSize))
            return BadRequest(new { message = "Filtros inválidos. pageSize deve estar entre 1 e 100; o texto tem limite de 100 caracteres." });

        var query = db.SystemAuditEvents.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue) query = query.Where(x => x.OccurredAtUtc >= DateTime.SpecifyKind(fromUtc.Value, DateTimeKind.Utc));
        if (toUtc.HasValue) query = query.Where(x => x.OccurredAtUtc <= DateTime.SpecifyKind(toUtc.Value, DateTimeKind.Utc));
        if (!string.IsNullOrWhiteSpace(userId)) query = query.Where(x => x.ActorUserId == userId);
        if (!string.IsNullOrWhiteSpace(module)) query = query.Where(x => x.Module == module);
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(x => x.Action == action);
        if (!string.IsNullOrWhiteSpace(outcome)) query = query.Where(x => x.Outcome == outcome);
        if (!string.IsNullOrWhiteSpace(text))
        {
            var term = $"%{text.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Action, term) || EF.Functions.ILike(x.Module, term) || EF.Functions.ILike(x.ResourceType, term) || (x.ActorDisplayName != null && EF.Functions.ILike(x.ActorDisplayName, term)) || (x.TechnicalContext != null && EF.Functions.ILike(x.TechnicalContext, term)));
        }
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.OccurredAtUtc).ThenByDescending(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DateTime? fromUtc, [FromQuery] DateTime? toUtc, CancellationToken ct)
    {
        if (fromUtc > toUtc) return BadRequest(new { message = "Período inválido." });
        var query = db.SystemAuditEvents.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue) query = query.Where(x => x.OccurredAtUtc >= DateTime.SpecifyKind(fromUtc.Value, DateTimeKind.Utc));
        if (toUtc.HasValue) query = query.Where(x => x.OccurredAtUtc <= DateTime.SpecifyKind(toUtc.Value, DateTimeKind.Utc));
        var rows = await query.OrderByDescending(x => x.OccurredAtUtc).Take(10000).ToListAsync(ct);
        static string Esc(string? value)
        {
            var safe = value ?? string.Empty;
            if (safe.Length > 0 && safe[0] is '=' or '+' or '-' or '@' or '\t' or '\r') safe = "'" + safe;
            return "\"" + safe.Replace("\"", "\"\"") + "\"";
        }
        var csv = new StringBuilder("occurredAtUtc,actor,category,module,action,outcome,resourceType,resourceId,ip,status,traceId\n");
        foreach (var x in rows) csv.AppendLine(string.Join(',', Esc(x.OccurredAtUtc.ToString("O")), Esc(x.ActorDisplayName), Esc(x.Category), Esc(x.Module), Esc(x.Action), Esc(x.Outcome), Esc(x.ResourceType), Esc(x.ResourceId), Esc(x.IpAddress), Esc(x.StatusCode?.ToString()), Esc(x.TraceId)));
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray(), "text/csv; charset=utf-8", "auditoria.csv");
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> Notifications([FromQuery] bool? unreadOnly = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken ct = default)
    {
        if (page < 1 || pageSize is < 1 or > 100) return BadRequest(new { message = "Paginação inválida." });
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var query = db.AdminNotifications.AsNoTracking().Where(n => n.RecipientUserId == userId);
        if (unreadOnly == true) query = query.Where(n => n.ReadAtUtc == null);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(n => n.CreatedOn).ThenByDescending(n => n.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var unread = await db.AdminNotifications.CountAsync(n => n.RecipientUserId == userId && n.ReadAtUtc == null, ct);
        return Ok(new { items, total, unread, page, pageSize });
    }

    [HttpPatch("notifications/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var notification = await db.AdminNotifications.SingleOrDefaultAsync(n => n.Id == id && n.RecipientUserId == userId, ct);
        if (notification is null) return NotFound();
        notification.ReadAtUtc ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
