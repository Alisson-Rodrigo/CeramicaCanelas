using System.Security.Claims;
using CeramicaCanelas.WebApi.Auditing;
using CeramicaCanelas.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(DefaultContext db) : ControllerBase
{
    private sealed record GlobalUpdate(Guid Id, string Message, string Module, string Priority, DateTime CreatedOn,
        DateTime OccurredAtUtc, DateTime? ReadAtUtc);

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] bool unreadOnly = false, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        if (page < 1 || pageSize is < 1 or > 50) return BadRequest(new { message = "Paginação inválida." });
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Forbid();
        var roles = await db.UserRoles.AsNoTracking().Where(x => x.UserId == userId)
            .Join(db.Roles.AsNoTracking(), x => x.RoleId, r => r.Id, (_, role) => role.Name!).ToListAsync(ct);
        var isAdmin = roles.Contains("Admin", StringComparer.OrdinalIgnoreCase);
        var modules = new List<string>();
        if (roles.Contains("Almoxarifado", StringComparer.OrdinalIgnoreCase)) modules.Add("Almoxarifado");
        if (roles.Contains("Sales", StringComparer.OrdinalIgnoreCase)) modules.Add("Vendas");
        if (roles.Contains("Financial", StringComparer.OrdinalIgnoreCase)) modules.AddRange(["Vendas", "Financeiro", "Pagamentos"]);
        var allowedEventKeys = BusinessUpdateCatalog.AllowedEventKeys.ToArray();
        var visible = db.AdminNotifications.AsNoTracking().Where(n => n.RecipientUserId == userId)
            .Join(db.SystemAuditEvents.AsNoTracking(), n => n.AuditEventId, e => e.Id,
                (n, e) => new { Notification = n, Event = e });
        visible = visible.Where(x => x.Event.Category == "BusinessAudit" && x.Event.Outcome == "Success" &&
            x.Event.HttpMethod != null && allowedEventKeys.Contains(x.Event.ResourceType + "|" + x.Event.Action + "|" + x.Event.HttpMethod));
        if (!isAdmin) visible = visible.Where(x => modules.Contains(x.Event.Module));
        var unread = await visible.CountAsync(x => x.Notification.ReadAtUtc == null && x.Event.ActorUserId != userId, ct);
        var query = visible;
        if (unreadOnly) query = query.Where(x => x.Notification.ReadAtUtc == null && x.Event.ActorUserId != userId);
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.Event.OccurredAtUtc).ThenByDescending(x => x.Notification.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new
                {
                    x.Notification.Id, x.Notification.Priority, x.Notification.CreatedOn,
                    x.Notification.ReadAtUtc, x.Event.Category, x.Event.Outcome, x.Event.Module,
                    x.Event.ResourceType, x.Event.Action, x.Event.HttpMethod, x.Event.TechnicalContext,
                    x.Event.ActorUserId, x.Event.ActorDisplayName, x.Event.OccurredAtUtc
                }).ToListAsync(ct);
        var items = rows.Select(row =>
        {
            if (!BusinessUpdateCatalog.TryGet(row.Category, row.Outcome, row.Module, row.ResourceType,
                    row.Action, row.HttpMethod, row.TechnicalContext, row.ActorDisplayName, out var message)) return null;
            return new GlobalUpdate(row.Id, message.Message, message.Module, row.Priority, row.CreatedOn,
                row.OccurredAtUtc, row.ActorUserId == userId ? row.ReadAtUtc ?? row.OccurredAtUtc : row.ReadAtUtc);
        }).Where(x => x is not null).ToList();
        return Ok(new { items, total, unread, page, pageSize });
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Forbid();
        var roles = await db.UserRoles.AsNoTracking().Where(x => x.UserId == userId)
            .Join(db.Roles.AsNoTracking(), x => x.RoleId, r => r.Id, (_, role) => role.Name!).ToListAsync(ct);
        var isAdmin = roles.Contains("Admin", StringComparer.OrdinalIgnoreCase);
        var modules = new List<string>();
        if (roles.Contains("Almoxarifado", StringComparer.OrdinalIgnoreCase)) modules.Add("Almoxarifado");
        if (roles.Contains("Sales", StringComparer.OrdinalIgnoreCase)) modules.Add("Vendas");
        if (roles.Contains("Financial", StringComparer.OrdinalIgnoreCase)) modules.AddRange(["Vendas", "Financeiro", "Pagamentos"]);
        var allowedEventKeys = BusinessUpdateCatalog.AllowedEventKeys.ToArray();
        var notification = await db.AdminNotifications.Where(n => n.Id == id && n.RecipientUserId == userId)
            .Join(db.SystemAuditEvents, n => n.AuditEventId, e => e.Id,
                (n, e) => new { Notification = n, Event = e })
            .Where(x => x.Event.Category == "BusinessAudit" && x.Event.Outcome == "Success" &&
                x.Event.HttpMethod != null && allowedEventKeys.Contains(x.Event.ResourceType + "|" + x.Event.Action + "|" + x.Event.HttpMethod))
            .Where(x => isAdmin || modules.Contains(x.Event.Module))
            .Select(x => x.Notification).SingleOrDefaultAsync(ct);
        if (notification is null) return NotFound();
        notification.ReadAtUtc ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
