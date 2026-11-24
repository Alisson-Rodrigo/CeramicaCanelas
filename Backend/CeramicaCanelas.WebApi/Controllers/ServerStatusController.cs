using CeramicaCanelas.WebApi.Monitoring;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/server-status")]
public sealed class ServerStatusController(HostMetricsCollector hostMetrics, BackupStatusReader backups) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ServerStatusResponse>> Get(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new ServerStatusResponse(hostMetrics.Latest, await backups.Read(ct)));
    }
}

public sealed record ServerStatusResponse(HostMetricsSnapshot Metrics, BackupMeasurement Backup);
