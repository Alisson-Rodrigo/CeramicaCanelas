using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.WebApi.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = "Financial,Admin")]
public sealed class PaymentsController(IPaymentApplicationService service) : ControllerBase
{
    private string Actor => User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? throw new InvalidOperationException("Usuario autenticado sem identificador.");
    [HttpGet("people/{personId:guid}/absences")] public async Task<IActionResult> Absences(Guid personId, int year, int month, CancellationToken ct) => Ok(await service.GetAbsencesAsync(personId, year, month, ct));
    [HttpPost("people/{personId:guid}/absences")] public async Task<IActionResult> CreateAbsence(Guid personId, [FromBody] AbsenceRequest request, CancellationToken ct) => Ok(await service.SaveAbsenceAsync(personId, null, request, Actor, ct));
    [HttpPut("people/{personId:guid}/absences/{id:guid}")] public async Task<IActionResult> UpdateAbsence(Guid personId, Guid id, [FromBody] AbsenceRequest request, CancellationToken ct) => Ok(await service.SaveAbsenceAsync(personId, id, request, Actor, ct));
    [HttpGet("people/{personId:guid}/audit")] public async Task<IActionResult> Audit(Guid personId, CancellationToken ct) => Ok(await service.GetAuditAsync(personId, ct));
    [HttpGet("people/{personId:guid}/dsr")] public async Task<IActionResult> Dsr(Guid personId, CancellationToken ct) => Ok(await service.GetDsrAsync(personId, ct));
    [HttpGet("people/{personId:guid}/accountant-summary")] public async Task<IActionResult> AccountantSummary(Guid personId, int year, int month, CancellationToken ct) => Ok(await service.GetAccountantSummaryAsync(personId, year, month, ct));
    [HttpPost("preparations")] public async Task<IActionResult> SavePreparation([FromBody] PreparationRequest request, CancellationToken ct) => Ok(await service.SavePreparationAsync(request, Actor, ct));
    [HttpGet("preparations")] public async Task<IActionResult> GetPreparation(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct) => Ok(await service.GetPreparationAsync(personId, year, month, fortnight, ct));
    [HttpPost("calculations/{id:guid}/adjustments")] public async Task<IActionResult> CreateAdjustment(Guid id, [FromBody] AdjustmentRequest request, CancellationToken ct) => Ok(await service.CreateAdjustmentAsync(id, request, Actor, ct));
    [HttpGet("calculations/{id:guid}/adjustments")] public async Task<IActionResult> GetAdjustments(Guid id, CancellationToken ct) => Ok(await service.GetAdjustmentsAsync(id, ct));
    [HttpPatch("calculations/{id:guid}/adjustments/paid")] public async Task<IActionResult> PayAdjustment(Guid id, [FromBody] AdjustmentPaidRequest request, CancellationToken ct) { await service.PayAdjustmentAsync(id, request, Actor, ct); return NoContent(); }
    [HttpGet("people/{personId:guid}/monthly-summary")] public async Task<IActionResult> MonthlySummary(Guid personId, int year, int month, CancellationToken ct) => Ok(await service.GetMonthlySummaryAsync(personId, year, month, ct));
    [HttpDelete("people/{personId:guid}")]
    public async Task<IActionResult> DeletePerson(Guid personId, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct) { await service.DeletePersonAsync(personId, request, Actor, ct); return NoContent(); }
    [HttpDelete("people/{personId:guid}/absences/{id:guid}")]
    public async Task<IActionResult> DeleteAbsence(Guid personId, Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct) { await service.DeleteAbsenceAsync(personId, id, request, Actor, ct); return NoContent(); }
    [HttpDelete("vouchers/{id:guid}")]
    public async Task<IActionResult> DeleteVoucher(Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct) { await service.DeleteVoucherAsync(id, request, Actor, ct); return NoContent(); }
    [HttpDelete("preparations/{id:guid}")]
    public async Task<IActionResult> DeletePreparation(Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct) { await service.DeletePreparationAsync(id, request, Actor, ct); return NoContent(); }
    [HttpDelete("calculations/{id:guid}")]
    public async Task<IActionResult> DeleteCalculation(Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct) { await service.DeleteCalculationAsync(id, request, Actor, ct); return NoContent(); }
    [HttpGet("employees/{personId:guid}/vouchers")]
    public async Task<IActionResult> EmployeeVouchers(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct) => Ok(await service.GetEmployeeVouchersAsync(personId, year, month, fortnight, ct));
    [HttpPatch("employees/{personId:guid}/absences/{id:guid}/review")]
    public async Task<IActionResult> ReviewEmployeeAbsence(Guid personId, Guid id, [FromBody] ReviewEmployeeAbsenceRequest request, CancellationToken ct) { await service.ReviewEmployeeAbsenceAsync(personId, id, request, Actor, ct); return NoContent(); }
    [HttpPost("employees/{personId:guid}/accountant-submissions")]
    public async Task<IActionResult> RegisterEmployeeAccountantSummary(Guid personId, [FromBody] RegisterEmployeeAccountantSummaryRequest request, CancellationToken ct) => Ok(await service.RegisterEmployeeAccountantSummaryAsync(personId, request, Actor, ct));
    [HttpGet("employees/{personId:guid}/accountant-submissions")]
    public async Task<IActionResult> EmployeeAccountantSubmissions(Guid personId, int year, int month, CancellationToken ct) => Ok(await service.GetEmployeeAccountantSubmissionsAsync(personId, year, month, ct));
    [HttpGet("people")] public async Task<IActionResult> GetPeople(CancellationToken ct) => Ok(await service.GetPeopleAsync(ct));
    [HttpPost("people"), Consumes("multipart/form-data")] public async Task<IActionResult> CreatePerson([FromForm] CreatePaymentPersonForm form, CancellationToken ct) { var result = await service.CreatePersonAsync(form.ToRequest(), ct, Actor); return Created($"api/payments/people/{result.Id}", result); }
    [HttpPatch("people/{personId:guid}/salary"), Consumes("multipart/form-data")] public async Task<IActionResult> UpdateSalary(Guid personId, [FromForm] UpdateSalaryForm form, CancellationToken ct) { await service.UpdateSalaryAsync(personId, form.ToRequest(), ct, Actor); return NoContent(); }
    [HttpPatch("people/{personId:guid}/status"), Consumes("multipart/form-data")] public async Task<IActionResult> UpdatePersonStatus(Guid personId, [FromForm] UpdatePaymentPersonStatusForm form, CancellationToken ct) { await service.UpdatePersonStatusAsync(personId, form.IsActive, ct, Actor); return NoContent(); }
    [HttpGet("rules")] public async Task<IActionResult> GetRules(CancellationToken ct) => Ok(await service.GetRulesAsync(ct));
    [HttpPost("rules"), Consumes("multipart/form-data")] public async Task<IActionResult> CreateRules([FromForm] PaymentRulesForm form, CancellationToken ct) { var result = await service.CreateRulesAsync(form.ToRequest(), ct); return Created("api/payments/rules", result); }
    [HttpGet("vouchers")] public async Task<IActionResult> GetVouchers([FromQuery] Guid? personId, CancellationToken ct) => Ok(await service.GetVouchersAsync(personId, ct));
    [HttpPost("vouchers"), Consumes("multipart/form-data")] public async Task<IActionResult> CreateVoucher([FromForm] CreateVoucherForm form, CancellationToken ct) { var result = await service.CreateVoucherAsync(form.ToRequest(), ct); return Created($"api/payments/vouchers/{result.Id}", result); }
    [HttpPatch("vouchers/{voucherId:guid}/status"), Consumes("multipart/form-data")] public async Task<IActionResult> UpdateVoucherStatus(Guid voucherId, [FromForm] UpdateVoucherStatusForm form, CancellationToken ct) { await service.UpdateVoucherStatusAsync(voucherId, form.Status, ct); return NoContent(); }
    [HttpPost("calculations/preview"), Consumes("multipart/form-data")] public async Task<IActionResult> Preview([FromForm] CalculatePaymentForm form, CancellationToken ct) => Ok(await service.PreviewAsync(form.ToRequest(), ct));
    [HttpPost("calculations"), Consumes("multipart/form-data")] public async Task<IActionResult> Confirm([FromForm] CalculatePaymentForm form, CancellationToken ct) { var result = await service.ConfirmAsync(form.ToRequest(), ct, Actor); return Created($"api/payments/calculations/{result.Id}", result); }
    [HttpGet("calculations")] public async Task<IActionResult> GetHistory([FromQuery] Guid? personId, [FromQuery] int? year, [FromQuery] int? month, [FromQuery] Fortnight? fortnight, CancellationToken ct) => Ok(await service.GetHistoryAsync(personId, year, month, fortnight, ct));
    [HttpGet("calculations/export"), Produces("application/pdf")] public async Task<IActionResult> ExportPayments([FromQuery] Guid? personId, [FromQuery] int? year, [FromQuery] int? month, [FromQuery] Fortnight? fortnight, CancellationToken ct) { var export = await service.ExportPaymentsAsync(personId, year, month, fortnight, ct); return File(export.Content, export.ContentType, export.FileName); }
    [HttpGet("calculations/bonuses/export"), Produces("application/pdf")] public async Task<IActionResult> ExportBonuses([FromQuery] Guid? personId, [FromQuery] int? year, [FromQuery] int? month, [FromQuery] Fortnight? fortnight, CancellationToken ct) { var export = await service.ExportBonusesAsync(personId, year, month, fortnight, ct); return File(export.Content, export.ContentType, export.FileName); }
    [HttpPatch("calculations/{calculationId:guid}/paid"), Consumes("multipart/form-data")] public async Task<IActionResult> MarkPaid(Guid calculationId, [FromForm] MarkPaymentPaidForm form, CancellationToken ct) { await service.MarkPaidAsync(calculationId, form.PaidAt, ct, Actor); return NoContent(); }
}
