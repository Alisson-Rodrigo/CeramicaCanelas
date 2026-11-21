using System.Security.Claims;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.WebApi.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/employee-payments")]
[Authorize(Roles = "Financial,Admin")]
public sealed class EmployeePaymentsController(IPaymentApplicationService service, IPaymentRepository repository) : ControllerBase
{
    private string Actor => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new InvalidOperationException("Usuario autenticado sem identificador.");

    private async Task Employee(Guid personId, CancellationToken ct)
    {
        var person = await repository.GetPersonAsync(personId, ct) ?? throw new KeyNotFoundException("Funcionario nao encontrado.");
        if (person.EmploymentType != EmploymentType.Employee) throw new InvalidOperationException("Este modulo aceita apenas funcionarios.");
    }
    private async Task Voucher(Guid id, CancellationToken ct)
    {
        var voucher = await repository.GetVoucherAsync(id, ct) ?? throw new KeyNotFoundException("Vale nao encontrado.");
        await Employee(voucher.PaymentPersonId, ct);
    }
    private async Task Calculation(Guid id, CancellationToken ct)
    {
        var calculation = await repository.GetCalculationAsync(id, ct) ?? throw new KeyNotFoundException("Apuracao nao encontrada.");
        if (calculation.EmploymentType != EmploymentType.Employee) throw new InvalidOperationException("Este modulo aceita apenas apuracoes de funcionarios.");
        await Employee(calculation.PaymentPersonId, ct);
    }
    private async Task Preparation(Guid id, CancellationToken ct)
    {
        var preparation = await repository.GetPreparationAsync(id, ct) ?? throw new KeyNotFoundException("Preparacao nao encontrada.");
        await Employee(preparation.PaymentPersonId, ct);
    }
    private static void Filters(int? year, int? month, Fortnight? fortnight)
    {
        if (year is < 2000 or > 9999 || month is < 1 or > 12 || (fortnight.HasValue && !Enum.IsDefined(fortnight.Value)))
            throw new InvalidOperationException("Competencia ou quinzena invalida.");
    }

    [HttpGet("people")]
    public async Task<IActionResult> People(CancellationToken ct) => Ok((await service.GetPeopleAsync(ct)).Where(x => x.EmploymentType == EmploymentType.Employee).ToList());

    [HttpPost("people"), Consumes("multipart/form-data")]
    public async Task<IActionResult> CreatePerson([FromForm] CreateEmployeePaymentPersonForm form, CancellationToken ct)
    {
        var person = await service.CreatePersonAsync(form.ToRequest(), ct, Actor);
        return Created($"api/employee-payments/people/{person.Id}", person);
    }
    [HttpPatch("people/{personId:guid}/salary"), Consumes("multipart/form-data")]
    public async Task<IActionResult> Salary(Guid personId, [FromForm] UpdateEmployeePaymentSalaryForm form, CancellationToken ct)
    { await Employee(personId, ct); await service.UpdateSalaryAsync(personId, form.ToRequest(), ct, Actor); return NoContent(); }
    [HttpPatch("people/{personId:guid}/status"), Consumes("multipart/form-data")]
    public async Task<IActionResult> Status(Guid personId, [FromForm] UpdatePaymentPersonStatusForm form, CancellationToken ct)
    { await Employee(personId, ct); await service.UpdatePersonStatusAsync(personId, form.IsActive, ct, Actor); return NoContent(); }
    [HttpDelete("people/{personId:guid}")]
    public async Task<IActionResult> DeletePerson(Guid personId, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct)
    { await Employee(personId, ct); await service.DeletePersonAsync(personId, request, Actor, ct); return NoContent(); }

    [HttpGet("people/{personId:guid}/vouchers")]
    public async Task<IActionResult> Vouchers(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct)
        => Ok(await service.GetEmployeeVouchersAsync(personId, year, month, fortnight, ct));
    [HttpPost("people/{personId:guid}/vouchers"), Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateVoucher(Guid personId, [FromForm] EmployeeVoucherForm form, CancellationToken ct)
    { await Employee(personId, ct); var voucher = await service.CreateVoucherAsync(form.ToRequest(personId), ct); return Created($"api/employee-payments/vouchers/{voucher.Id}", voucher); }
    [HttpPatch("vouchers/{id:guid}/status"), Consumes("multipart/form-data")]
    public async Task<IActionResult> VoucherStatus(Guid id, [FromForm] UpdateVoucherStatusForm form, CancellationToken ct)
    { await Voucher(id, ct); await service.UpdateVoucherStatusAsync(id, form.Status, ct); return NoContent(); }
    [HttpDelete("vouchers/{id:guid}")]
    public async Task<IActionResult> DeleteVoucher(Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct)
    { await Voucher(id, ct); await service.DeleteVoucherAsync(id, request, Actor, ct); return NoContent(); }

    [HttpGet("people/{personId:guid}/absences")]
    public async Task<IActionResult> Absences(Guid personId, int year, int month, CancellationToken ct)
    { await Employee(personId, ct); return Ok(await service.GetAbsencesAsync(personId, year, month, ct)); }
    [HttpPost("people/{personId:guid}/absences")]
    public async Task<IActionResult> CreateAbsence(Guid personId, [FromBody] AbsenceRequest request, CancellationToken ct)
    { await Employee(personId, ct); return Ok(await service.SaveAbsenceAsync(personId, null, request, Actor, ct)); }
    [HttpPut("people/{personId:guid}/absences/{id:guid}")]
    public async Task<IActionResult> UpdateAbsence(Guid personId, Guid id, [FromBody] AbsenceRequest request, CancellationToken ct)
    { await Employee(personId, ct); return Ok(await service.SaveAbsenceAsync(personId, id, request, Actor, ct)); }
    [HttpDelete("people/{personId:guid}/absences/{id:guid}")]
    public async Task<IActionResult> DeleteAbsence(Guid personId, Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct)
    { await Employee(personId, ct); await service.DeleteAbsenceAsync(personId, id, request, Actor, ct); return NoContent(); }
    [HttpPatch("people/{personId:guid}/absences/{id:guid}/review")]
    public async Task<IActionResult> Review(Guid personId, Guid id, [FromBody] ReviewEmployeeAbsenceRequest request, CancellationToken ct)
        { await service.ReviewEmployeeAbsenceAsync(personId, id, request, Actor, ct); return NoContent(); }

    [HttpGet("people/{personId:guid}/accountant-summary")]
    public async Task<IActionResult> AccountantSummary(Guid personId, int year, int month, CancellationToken ct)
        => Ok(await service.GetAccountantSummaryAsync(personId, year, month, ct));
    [HttpPost("people/{personId:guid}/accountant-submissions")]
    public async Task<IActionResult> Submit(Guid personId, [FromBody] RegisterEmployeeAccountantSummaryRequest request, CancellationToken ct)
        => Ok(await service.RegisterEmployeeAccountantSummaryAsync(personId, request, Actor, ct));
    [HttpGet("people/{personId:guid}/accountant-submissions")]
    public async Task<IActionResult> Submissions(Guid personId, int year, int month, CancellationToken ct)
        => Ok(await service.GetEmployeeAccountantSubmissionsAsync(personId, year, month, ct));
    [HttpGet("people/{personId:guid}/monthly-summary")]
    public async Task<IActionResult> Monthly(Guid personId, int year, int month, CancellationToken ct)
    { await Employee(personId, ct); return Ok(await service.GetMonthlySummaryAsync(personId, year, month, ct)); }
    [HttpGet("people/{personId:guid}/audit")]
    public async Task<IActionResult> Audit(Guid personId, CancellationToken ct)
    { await Employee(personId, ct); return Ok(await service.GetAuditAsync(personId, ct)); }

    [HttpPost("calculations/preview"), Consumes("multipart/form-data")]
    public async Task<IActionResult> Preview([FromForm] EmployeeCalculationForm form, CancellationToken ct)
    { await Employee(form.PaymentPersonId, ct); return Ok(await service.PreviewAsync(form.ToRequest(), ct)); }
    [HttpPost("calculations"), Consumes("multipart/form-data")]
    public async Task<IActionResult> Confirm([FromForm] EmployeeCalculationForm form, CancellationToken ct)
    { await Employee(form.PaymentPersonId, ct); var calculation = await service.ConfirmAsync(form.ToRequest(), ct, Actor); return Created($"api/employee-payments/calculations/{calculation.Id}", calculation); }
    [HttpGet("calculations")]
    public async Task<IActionResult> History(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken ct)
    { Filters(year, month, fortnight); if (personId.HasValue) await Employee(personId.Value, ct); return Ok((await service.GetHistoryAsync(personId, year, month, fortnight, ct)).Where(x => x.EmploymentType == EmploymentType.Employee).ToList()); }
    [HttpPatch("calculations/{id:guid}/paid"), Consumes("multipart/form-data")]
    public async Task<IActionResult> Paid(Guid id, [FromForm] MarkPaymentPaidForm form, CancellationToken ct)
    { await Calculation(id, ct); await service.MarkPaidAsync(id, form.PaidAt, ct, Actor); return NoContent(); }
    [HttpDelete("calculations/{id:guid}")]
    public async Task<IActionResult> DeleteCalculation(Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct)
    { await Calculation(id, ct); await service.DeleteCalculationAsync(id, request, Actor, ct); return NoContent(); }

    [HttpPost("preparations")]
    public async Task<IActionResult> SavePreparation([FromBody] PreparationRequest request, CancellationToken ct)
    { await Employee(request.Calculation.PaymentPersonId, ct); return Ok(await service.SavePreparationAsync(request, Actor, ct)); }
    [HttpGet("preparations")]
    public async Task<IActionResult> GetPreparation(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct)
    { await Employee(personId, ct); return Ok(await service.GetPreparationAsync(personId, year, month, fortnight, ct)); }
    [HttpDelete("preparations/{id:guid}")]
    public async Task<IActionResult> DeletePreparation(Guid id, [FromBody] DeletePaymentEntryRequest request, CancellationToken ct)
    { await Preparation(id, ct); await service.DeletePreparationAsync(id, request, Actor, ct); return NoContent(); }

    [HttpGet("calculations/{id:guid}/adjustments")]
    public async Task<IActionResult> Adjustments(Guid id, CancellationToken ct)
    { await Calculation(id, ct); return Ok(await service.GetAdjustmentsAsync(id, ct)); }
    [HttpPost("calculations/{id:guid}/adjustments")]
    public async Task<IActionResult> CreateAdjustment(Guid id, [FromBody] AdjustmentRequest request, CancellationToken ct)
    { await Calculation(id, ct); return Ok(await service.CreateAdjustmentAsync(id, request, Actor, ct)); }
    [HttpPatch("calculations/{id:guid}/adjustments/paid")]
    public async Task<IActionResult> PayAdjustment(Guid id, [FromBody] AdjustmentPaidRequest request, CancellationToken ct)
    { await Calculation(id, ct); await service.PayAdjustmentAsync(id, request, Actor, ct); return NoContent(); }

    [HttpGet("calculations/export"), Produces("application/pdf")]
    public async Task<IActionResult> Export(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken ct)
    { var file = await service.ExportEmployeePaymentsAsync(personId, year, month, fortnight, false, ct); return File(file.Content, file.ContentType, file.FileName); }
    [HttpGet("calculations/bonuses/export"), Produces("application/pdf")]
    public async Task<IActionResult> ExportBonuses(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken ct)
    { var file = await service.ExportEmployeePaymentsAsync(personId, year, month, fortnight, true, ct); return File(file.Content, file.ContentType, file.FileName); }

    // Shared rules are read-only here: employee UI cannot change contractor configuration.
    [HttpGet("rules")]
    public async Task<IActionResult> Rules(CancellationToken ct) => Ok((await service.GetRulesAsync(ct)).Select(x => new EmployeeBonusRuleDto(x.Id, x.EffectiveFrom, 100m, 50m)).ToList());
    [HttpGet("people/{personId:guid}/hours")]
    public async Task<IActionResult> Hours(Guid personId, int year, int month, CancellationToken ct) => Ok(await service.GetEmployeeHoursSummaryAsync(personId, year, month, ct));
    [HttpPost("people/{personId:guid}/hours")]
    public async Task<IActionResult> CreateHours(Guid personId, [FromBody] EmployeeTimeEntryRequest request, CancellationToken ct) => Ok(await service.SaveEmployeeTimeEntryAsync(personId, null, request, Actor, ct));
    [HttpPut("people/{personId:guid}/hours/{id:guid}")]
    public async Task<IActionResult> UpdateHours(Guid personId, Guid id, [FromBody] EmployeeTimeEntryRequest request, CancellationToken ct) => Ok(await service.SaveEmployeeTimeEntryAsync(personId, id, request, Actor, ct));
    [HttpGet("reports/accountant/export"), Produces("application/pdf")]
    public async Task<IActionResult> AccountantExport(Guid? personId, int year, int month, CancellationToken ct)
    { var report = await service.ExportEmployeeAccountantReportAsync(personId, year, month, ct); return File(report.Content, report.ContentType, report.FileName); }
    [HttpGet("reports/vouchers")]
    public async Task<IActionResult> VoucherSheet(Guid? personId, int year, int month, CancellationToken ct) => Ok(await service.GetEmployeeVoucherSheetAsync(personId, year, month, ct));
    [HttpGet("reports/vouchers/export"), Produces("text/csv")]
    public async Task<IActionResult> VoucherSheetExport(Guid? personId, int year, int month, CancellationToken ct)
    { var report = await service.ExportEmployeeVoucherSheetAsync(personId, year, month, ct); return File(report.Content, report.ContentType, report.FileName); }
    [HttpGet("reports/bonuses")]
    public async Task<IActionResult> BonusReport(Guid? personId, int year, int month, CancellationToken ct) => Ok(await service.GetEmployeeBonusReportAsync(personId, year, month, ct));
    [HttpGet("reports/bonuses/export"), Produces("application/pdf")]
    public async Task<IActionResult> BonusReportExport(Guid? personId, int year, int month, CancellationToken ct)
    { var report = await service.ExportEmployeeBonusReportAsync(personId, year, month, ct); return File(report.Content, report.ContentType, report.FileName); }
}
