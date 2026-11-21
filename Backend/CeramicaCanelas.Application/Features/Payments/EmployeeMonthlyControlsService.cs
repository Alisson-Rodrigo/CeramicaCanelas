using System.Globalization;
using System.Text;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed partial class PaymentApplicationService
{
    private static EmployeeTimeEntryDto TimeDto(EmployeeTimeEntry x) => new(x.Id, x.Date, x.PositiveMinutes, x.NegativeMinutes, x.Notes, x.IsCancelled, x.Revision, x.RecordedBy);

    public async Task<EmployeeHoursSummaryDto> GetEmployeeHoursSummaryAsync(Guid personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month); await GetEmployee(personId, ct);
        var entries = await repository.GetEmployeeTimeEntriesAsync(personId, year, month, ct);
        var positive = entries.Where(x => !x.IsCancelled).Sum(x => (long)x.PositiveMinutes);
        var negative = entries.Where(x => !x.IsCancelled).Sum(x => (long)x.NegativeMinutes);
        return new(positive, negative, positive - negative, entries.Select(TimeDto).ToList());
    }

    public async Task<EmployeeTimeEntryDto> SaveEmployeeTimeEntryAsync(Guid personId, Guid? id, EmployeeTimeEntryRequest request, string actor, CancellationToken ct)
    {
        ValidateCompetence(request.Date.Year, request.Date.Month);
        var person = await GetEmployee(personId, ct);
        if (string.IsNullOrWhiteSpace(actor)) throw new InvalidOperationException("Usuario responsavel obrigatorio.");
        if (person.IsDeleted && !id.HasValue) throw new InvalidOperationException("Funcionario excluido.");
        if (request.PositiveMinutes < 0 || request.NegativeMinutes < 0 || (request.PositiveMinutes == 0 && request.NegativeMinutes == 0))
            throw new InvalidOperationException("Registre minutos positivos ou negativos, sem valores negativos nos campos.");
        if (request.Notes?.Length > 2000) throw new InvalidOperationException("Observacao excede 2000 caracteres.");
        var existing = id.HasValue ? await repository.GetEmployeeTimeEntryAsync(id.Value, ct) ?? throw new KeyNotFoundException("Registro de horas nao encontrado.") : null;
        if (existing != null && existing.PaymentPersonId != personId) throw new KeyNotFoundException("Registro de horas nao pertence ao funcionario.");
        if (existing != null && existing.Revision != request.Revision) throw new InvalidOperationException("Registro de horas alterado por outro usuario.");
        if ((await repository.GetEmployeeTimeEntriesAsync(personId, request.Date.Year, request.Date.Month, ct)).Any(x => x.Date == request.Date && x.Id != id))
            throw new InvalidOperationException("Ja existe registro de horas nesta data. Corrija o registro existente.");
        foreach (var date in existing == null ? new[] { request.Date } : new[] { request.Date, existing.Date })
        {
            var history = await repository.GetHistoryAsync(personId, date.Year, date.Month, null, ct);
            if (history.Any(x => x.Status is PaymentCalculationStatus.Calculated or PaymentCalculationStatus.Paid)
                && (!request.CorrectClosedPeriod || string.IsNullOrWhiteSpace(request.Notes)))
                throw new InvalidOperationException("Periodo fechado: confirme a correcao e informe o motivo. Resumos anteriores permanecem preservados.");
        }
        var before = existing == null ? "null" : System.Text.Json.JsonSerializer.Serialize(TimeDto(existing));
        var entry = existing ?? new EmployeeTimeEntry { PaymentPersonId = personId, RecordedBy = actor };
        entry.Date = request.Date; entry.PositiveMinutes = request.PositiveMinutes; entry.NegativeMinutes = request.NegativeMinutes;
        entry.Notes = request.Notes ?? string.Empty; entry.IsCancelled = request.IsCancelled; entry.Revision++; entry.ModifiedOn = DateTime.UtcNow;
        person.Revision++;
        Audit(personId, entry.Id, existing == null ? "EmployeeHoursCreated" : "EmployeeHoursUpdated", before, TimeDto(entry), entry.Notes, actor);
        if (existing == null) repository.AddEmployeeTimeEntry(entry);
        await repository.SaveChangesAsync(ct);
        return TimeDto(entry);
    }

    private async Task<EmployeeBonusSettlement> BuildEmployeeBonusAsync(PaymentPerson person, int year, int month, CancellationToken ct)
    {
        var absences = (await repository.GetAbsencesAsync(person.Id, new(year, month, 1), new(year, month, DateTime.DaysInMonth(year, month)), ct)).Where(x => !x.IsCancelled).ToList();
        var full = absences.Count(x => !x.IsHalf); var half = absences.Count(x => x.IsHalf);
        var fullDeduction = full * 100m; var halfDeduction = half * 50m;
        return new() { PaymentPersonId = person.Id, PersonName = person.Name, Year = year, Month = month, OriginalValue = person.MonthlyBonus,
            FullAbsences = full, HalfAbsences = half, FullAbsenceDeduction = fullDeduction, HalfAbsenceDeduction = halfDeduction,
            DeductionValue = fullDeduction + halfDeduction, NetValue = Math.Max(0, person.MonthlyBonus - fullDeduction - halfDeduction),
            SourceAbsenceIds = string.Join(",", absences.Select(x => x.Id)) };
    }
    private static EmployeeBonusReportDto BonusDto(EmployeeBonusSettlement x) => new(x.Id, x.PaymentPersonId, x.PersonName, x.Year, x.Month,
        x.OriginalValue, x.FullAbsences, x.HalfAbsences, x.FullAbsenceDeduction, x.HalfAbsenceDeduction, x.DeductionValue,
        x.OriginalValue - x.NetValue, x.NetValue, true, x.IsCancelled, false);

    public async Task<IReadOnlyCollection<EmployeeBonusReportDto>> GetEmployeeBonusReportAsync(Guid? personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month);
        var settlements = await repository.GetEmployeeBonusesAsync(personId, year, month, ct);
        var history = (await repository.GetHistoryAsync(personId, year, month, Fortnight.Second, ct))
            .Where(x => x.EmploymentType == EmploymentType.Employee && x.Status != PaymentCalculationStatus.Cancelled).ToList();
        var people = personId.HasValue ? new List<PaymentPerson> { await GetEmployee(personId.Value, ct) }
            : (await repository.GetPeopleAsync(ct)).Where(x => x.EmploymentType == EmploymentType.Employee).ToList();
        var ids = people.Select(x => x.Id).Concat(history.Select(x => x.PaymentPersonId)).Concat(settlements.Where(x => !x.IsCancelled).Select(x => x.PaymentPersonId)).Distinct();
        var result = new List<EmployeeBonusReportDto>();
        foreach (var id in ids)
        {
            var frozen = settlements.SingleOrDefault(x => x.PaymentPersonId == id && !x.IsCancelled);
            if (frozen != null) { result.Add(BonusDto(frozen)); continue; }
            var legacy = history.SingleOrDefault(x => x.PaymentPersonId == id && x.EmployeePaymentFlowVersion != 1);
            if (legacy != null)
            {
                var original = legacy.Items.Where(x => x.Kind == PaymentItemKind.Bonus).Sum(x => x.Amount);
                var deduction = legacy.Items.Where(x => x.Kind == PaymentItemKind.BonusAbsenceDeduction).Sum(x => x.Amount);
                // Do not reconstruct unknown attendance counts or authorize a second bonus payment from old payrolls.
                result.Add(new(null, id, legacy.PersonName, year, month, original, null, null, null, null,
                    deduction, Math.Min(original, deduction), Math.Max(0, original - deduction), true, false, true));
                continue;
            }
            var person = people.SingleOrDefault(x => x.Id == id) ?? await GetEmployee(id, ct);
            var preview = await BuildEmployeeBonusAsync(person, year, month, ct);
            result.Add(BonusDto(preview) with { SettlementId = null, IsClosed = false });
        }
        return result.OrderBy(x => x.PersonName).ToList();
    }

    public async Task<IReadOnlyCollection<EmployeeVoucherSheetRow>> GetEmployeeVoucherSheetAsync(Guid? personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month); if (personId.HasValue) await GetEmployee(personId.Value, ct);
        var vouchers = await repository.GetVouchersAsync(personId, ct);
        var history = await repository.GetHistoryAsync(personId, null, null, null, ct);
        var rows = new List<EmployeeVoucherSheetRow>();
        foreach (var voucher in vouchers)
        {
            var owner = await repository.GetPersonAsync(voucher.PaymentPersonId, ct);
            if (owner?.EmploymentType != EmploymentType.Employee) continue;
            var applications = history.Where(x => x.PaymentPersonId == owner.Id && x.Status != PaymentCalculationStatus.Cancelled)
                .SelectMany(c => c.Items.Where(i => i.Kind == PaymentItemKind.Voucher && i.VoucherId == voucher.Id).Select(i => new { Calculation = c, i.Amount })).ToList();
            var period = applications.Where(x => x.Calculation.CompetenceYear == year && x.Calculation.CompetenceMonth == month).ToList();
            if (voucher.Date > new DateOnly(year, month, DateTime.DaysInMonth(year, month)) && period.Count == 0) continue;
            var first = period.Where(x => x.Calculation.Fortnight == Fortnight.First).Sum(x => x.Amount);
            var second = period.Where(x => x.Calculation.Fortnight == Fortnight.Second).Sum(x => x.Amount);
            rows.Add(new(voucher.Id, owner.Id, owner.Name, voucher.Date, voucher.TotalValue, first, second, first + second,
                voucher.TotalValue.HasValue && voucher.RemainingBalance.HasValue ? voucher.TotalValue - voucher.RemainingBalance : null,
                voucher.RemainingBalance, year, month, period.Where(x => x.Calculation.Status == PaymentCalculationStatus.Paid).Sum(x => x.Amount),
                period.Where(x => x.Calculation.Status != PaymentCalculationStatus.Paid).Sum(x => x.Amount)));
        }
        return rows.OrderBy(x => x.PersonName).ThenBy(x => x.VoucherDate).ToList();
    }

    public async Task<PaymentExportFileDto> ExportEmployeeVoucherSheetAsync(Guid? personId, int year, int month, CancellationToken ct)
    {
        var rows = await GetEmployeeVoucherSheetAsync(personId, year, month, ct);
        var text = new StringBuilder("Funcionario;Data do vale;Valor original;Desconto primeira quinzena;Desconto segunda quinzena;Descontos na competencia;Total descontado ate hoje;Saldo atual pendente;Competencia;Descontos pagos na competencia;Descontos reservados na competencia\r\n");
        static string Cell(string value) => "\"" + value.Replace("\"", "\"\"") + "\"";
        static string SafeText(string value) => Cell(value.Length > 0 && "=+-@\t\r\n".Contains(value[0]) ? "'" + value : value);
        static string MoneyCell(decimal? value) => value.HasValue ? Cell(value.Value.ToString("0.00", CultureInfo.GetCultureInfo("pt-BR"))) : "";
        foreach (var r in rows) text.AppendLine(string.Join(";", SafeText(r.PersonName), Cell(r.VoucherDate.ToString("yyyy-MM-dd")), MoneyCell(r.OriginalValue),
            MoneyCell(r.FirstFortnightDiscount), MoneyCell(r.SecondFortnightDiscount), MoneyCell(r.DiscountedInCompetence), MoneyCell(r.TotalDiscounted), MoneyCell(r.PendingBalance),
            Cell($"{year}-{month:00}"), MoneyCell(r.PaidDiscountsInCompetence), MoneyCell(r.ReservedDiscountsInCompetence)));
        return new(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(text.ToString())).ToArray(), "text/csv; charset=utf-8", $"vales-funcionarios-{year}-{month:00}.csv");
    }

    public async Task<PaymentExportFileDto> ExportEmployeeAccountantReportAsync(Guid? personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month);
        var people = personId.HasValue ? new List<PaymentPerson> { await GetEmployee(personId.Value, ct) }
            : (await repository.GetPeopleAsync(ct)).Where(x => x.EmploymentType == EmploymentType.Employee).ToList();
        var reports = new List<AccountantSummaryDto>();
        foreach (var person in people) reports.Add(await GetAccountantSummaryAsync(person.Id, year, month, ct));
        return new(pdfReportService.BuildEmployeeAccountantReportPdf(reports, year, month, PaymentLogoPath()), "application/pdf", $"apuracao-contador-{year}-{month:00}.pdf");
    }
    public async Task<PaymentExportFileDto> ExportEmployeeBonusReportAsync(Guid? personId, int year, int month, CancellationToken ct)
    {
        var reports = await GetEmployeeBonusReportAsync(personId, year, month, ct);
        return new(pdfReportService.BuildEmployeeBonusReportPdf(reports, year, month, PaymentLogoPath()), "application/pdf", $"bonificacao-interna-{year}-{month:00}.pdf");
    }
}
