using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.WebApi.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = "Financial,Admin")]
public sealed class PaymentsController(IPaymentApplicationService service) : ControllerBase
{
    [HttpGet("people")] public async Task<IActionResult> GetPeople(CancellationToken ct) => Ok(await service.GetPeopleAsync(ct));
    [HttpPost("people"), Consumes("multipart/form-data")] public async Task<IActionResult> CreatePerson([FromForm] CreatePaymentPersonForm form, CancellationToken ct) { var result = await service.CreatePersonAsync(form.ToRequest(), ct); return Created($"api/payments/people/{result.Id}", result); }
    [HttpPatch("people/{personId:guid}/salary"), Consumes("multipart/form-data")] public async Task<IActionResult> UpdateSalary(Guid personId, [FromForm] UpdateSalaryForm form, CancellationToken ct) { await service.UpdateSalaryAsync(personId, form.ToRequest(), ct); return NoContent(); }
    [HttpPatch("people/{personId:guid}/status"), Consumes("multipart/form-data")] public async Task<IActionResult> UpdatePersonStatus(Guid personId, [FromForm] UpdatePaymentPersonStatusForm form, CancellationToken ct) { await service.UpdatePersonStatusAsync(personId, form.IsActive, ct); return NoContent(); }
    [HttpGet("rules")] public async Task<IActionResult> GetRules(CancellationToken ct) => Ok(await service.GetRulesAsync(ct));
    [HttpPost("rules"), Consumes("multipart/form-data")] public async Task<IActionResult> CreateRules([FromForm] PaymentRulesForm form, CancellationToken ct) { var result = await service.CreateRulesAsync(form.ToRequest(), ct); return Created("api/payments/rules", result); }
    [HttpGet("vouchers")] public async Task<IActionResult> GetVouchers([FromQuery] Guid? personId, CancellationToken ct) => Ok(await service.GetVouchersAsync(personId, ct));
    [HttpPost("vouchers"), Consumes("multipart/form-data")] public async Task<IActionResult> CreateVoucher([FromForm] CreateVoucherForm form, CancellationToken ct) { var result = await service.CreateVoucherAsync(form.ToRequest(), ct); return Created($"api/payments/vouchers/{result.Id}", result); }
    [HttpPatch("vouchers/{voucherId:guid}/status"), Consumes("multipart/form-data")] public async Task<IActionResult> UpdateVoucherStatus(Guid voucherId, [FromForm] UpdateVoucherStatusForm form, CancellationToken ct) { await service.UpdateVoucherStatusAsync(voucherId, form.Status, ct); return NoContent(); }
    [HttpPost("calculations/preview"), Consumes("multipart/form-data")] public async Task<IActionResult> Preview([FromForm] CalculatePaymentForm form, CancellationToken ct) => Ok(await service.PreviewAsync(form.ToRequest(), ct));
    [HttpPost("calculations"), Consumes("multipart/form-data")] public async Task<IActionResult> Confirm([FromForm] CalculatePaymentForm form, CancellationToken ct) { var result = await service.ConfirmAsync(form.ToRequest(), ct); return Created($"api/payments/calculations/{result.Id}", result); }
    [HttpGet("calculations")] public async Task<IActionResult> GetHistory([FromQuery] Guid? personId, [FromQuery] int? year, [FromQuery] int? month, CancellationToken ct) => Ok(await service.GetHistoryAsync(personId, year, month, ct));
    [HttpGet("calculations/export"), Produces("application/pdf")] public async Task<IActionResult> ExportPayments([FromQuery] Guid? personId, [FromQuery] int? year, [FromQuery] int? month, CancellationToken ct) { var export = await service.ExportPaymentsAsync(personId, year, month, ct); return File(export.Content, export.ContentType, export.FileName); }
    [HttpGet("calculations/bonuses/export"), Produces("application/pdf")] public async Task<IActionResult> ExportBonuses([FromQuery] Guid? personId, [FromQuery] int? year, [FromQuery] int? month, CancellationToken ct) { var export = await service.ExportBonusesAsync(personId, year, month, ct); return File(export.Content, export.ContentType, export.FileName); }
    [HttpPatch("calculations/{calculationId:guid}/paid"), Consumes("multipart/form-data")] public async Task<IActionResult> MarkPaid(Guid calculationId, [FromForm] MarkPaymentPaidForm form, CancellationToken ct) { await service.MarkPaidAsync(calculationId, form.PaidAt, ct); return NoContent(); }
}
