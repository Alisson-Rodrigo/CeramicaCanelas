using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Domain.Services.Payments;
using System.Text.Json;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed partial class PaymentApplicationService
{
    private static void ValidateEmployeeMoney(decimal amount, bool allowZero = true)
    {
        if (amount < 0 || (!allowZero && amount == 0) || amount != Money(amount))
            throw new InvalidOperationException("Informe valor monetario valido com ate duas casas decimais.");
    }

    private async Task<PaymentPerson> GetEmployee(Guid personId, CancellationToken ct)
    {
        var person = await GetPerson(personId, ct);
        if (person.EmploymentType != EmploymentType.Employee) throw new InvalidOperationException("Operacao exclusiva de funcionarios.");
        return person;
    }

    private static bool EmployeeVoucherAvailable(Voucher v, PaymentPerson person, int year, int month, Fortnight fortnight)
    {
        var end = new DateOnly(year, month, fortnight == Fortnight.First ? 15 : DateTime.DaysInMonth(year, month));
        return !person.IsDeleted && person.IsActive && v.Status == VoucherStatus.Active && v.TotalValue.HasValue
            && v.RemainingBalance is > 0 && v.Date <= end && new DateOnly(v.StartYear, v.StartMonth, 1) <= end;
    }

    private async Task<(List<Voucher> Vouchers, List<PaymentEntry> Entries)> SelectEmployeeVouchers(
        PaymentPerson person, CalculatePaymentRequest request, CancellationToken ct)
    {
        if (request.ExcludedVoucherIds?.Count > 0)
            throw new InvalidOperationException("Para funcionarios informe VoucherSelections; os vales nao sao aplicados automaticamente.");
        var selections = request.VoucherSelections ?? Array.Empty<EmployeeVoucherSelectionRequest>();
        if (selections.GroupBy(x => x.VoucherId).Any(g => g.Count() > 1)) throw new InvalidOperationException("Nao repita um vale na mesma apuracao.");
        var all = await repository.GetVouchersAsync(person.Id, ct);
        var vouchers = new List<Voucher>();
        var entries = new List<PaymentEntry>();
        foreach (var selection in selections)
        {
            ValidateEmployeeMoney(selection.Amount, false);
            var voucher = all.SingleOrDefault(x => x.Id == selection.VoucherId && x.PaymentPersonId == person.Id)
                ?? throw new KeyNotFoundException("Vale selecionado nao pertence ao funcionario.");
            if (!EmployeeVoucherAvailable(voucher, person, request.CompetenceYear, request.CompetenceMonth, request.Fortnight))
                throw new InvalidOperationException("Vale indisponivel: confira data, competencia, situacao e saldo finito.");
            if (selection.Amount > voucher.RemainingBalance!.Value) throw new InvalidOperationException("Desconto do vale superior ao saldo pendente.");
            vouchers.Add(voucher);
            entries.Add(new(voucher.Description, selection.Amount, voucher.Id));
        }
        return (vouchers, entries);
    }

    public async Task<IReadOnlyCollection<EmployeeVoucherDto>> GetEmployeeVouchersAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct)
    {
        ValidateCompetence(year, month); ValidateFortnight(fortnight);
        var person = await GetEmployee(personId, ct);
        var vouchers = await repository.GetVouchersAsync(personId, ct);
        var history = await repository.GetHistoryAsync(personId, null, null, null, ct);
        return vouchers.Select(v => new EmployeeVoucherDto(v.Id, personId, v.Description, v.Date, v.StartYear, v.StartMonth,
            v.TotalValue, v.TotalValue.HasValue && v.RemainingBalance.HasValue ? v.TotalValue.Value - v.RemainingBalance.Value : null,
            v.RemainingBalance, true, EmployeeVoucherAvailable(v, person, year, month, fortnight), v.Status,
            history.SelectMany(c => c.Items.Where(i => i.Kind == PaymentItemKind.Voucher && i.VoucherId == v.Id)
                .Select(i => new EmployeeVoucherDiscountDto(c.Id, c.CompetenceYear, c.CompetenceMonth, c.Fortnight, i.Amount, c.Status, c.CalculatedAt, c.PaidAt))).ToList())).ToList();
    }

    private static EmployeeSettlementDto? EmployeeSettlementFromSnapshot(PaymentCalculation calculation)
    {
        if (calculation.EmploymentType != EmploymentType.Employee) return null;
        return new(calculation.EmployeeAccountantAmount,
            calculation.Items.Where(x => x.Kind == PaymentItemKind.Voucher).Sum(x => x.Amount), calculation.NetValue,
            calculation.Fortnight == Fortnight.First ? calculation.EmployeeAccountantAmount : calculation.EmployeeFirstGrossValue,
            calculation.Fortnight == Fortnight.First ? calculation.NetValue : calculation.FirstFortnightPaid,
            calculation.Fortnight == Fortnight.First ? calculation.PaidAt : calculation.EmployeeFirstPaidAt,
            calculation.EmployeeAccountantReference, calculation.EmployeeAccountantNotes, calculation.EmployeePaymentFlowVersion != 1);
    }
    public async Task ReviewEmployeeAbsenceAsync(Guid personId, Guid absenceId, ReviewEmployeeAbsenceRequest request, string actor, CancellationToken ct)
    {
        var person = await GetEmployee(personId, ct);
        var absence = (await repository.GetAbsencesAsync(personId, new(2000, 1, 1), new(9999, 12, 31), ct))
            .SingleOrDefault(x => x.Id == absenceId) ?? throw new KeyNotFoundException("Falta nao encontrada.");
        if (absence.Revision != request.Revision) throw new InvalidOperationException("Ocorrencia alterada por outro usuario.");
        if (request.Notes?.Length > 2000) throw new InvalidOperationException("Observacao excede 2000 caracteres.");
        var before = new { absence.IsReviewed, absence.ReviewedAt, absence.ReviewedBy };
        absence.IsReviewed = request.IsReviewed;
        absence.ReviewedAt = request.IsReviewed ? DateTime.UtcNow : null;
        absence.ReviewedBy = request.IsReviewed ? actor : null;
        absence.Revision++;
        absence.ModifiedOn = DateTime.UtcNow;
        person.Revision++;
        Audit(person.Id, absence.Id, "EmployeeAbsenceReviewed", before,
            new { absence.IsReviewed, absence.ReviewedAt, absence.ReviewedBy }, request.Notes ?? "Conferencia de falta", actor);
        await repository.SaveChangesAsync(ct);
    }

    public async Task<EmployeeAccountantSubmissionDto> RegisterEmployeeAccountantSummaryAsync(Guid personId,
        RegisterEmployeeAccountantSummaryRequest request, string actor, CancellationToken ct)
    {
        ValidateCompetence(request.Year, request.Month);
        if (string.IsNullOrWhiteSpace(request.Reference) || request.Reference.Length > 150)
            throw new InvalidOperationException("Informe a referencia do resumo, com ate 150 caracteres.");
        var person = await GetEmployee(personId, ct);
        if (await repository.GetCalculationAsync(personId, request.Year, request.Month, Fortnight.Second, ct) != null)
            throw new InvalidOperationException("Competencia ja fechada. Consulte o resumo historico registrado.");
        var summary = await GetAccountantSummaryAsync(personId, request.Year, request.Month, ct);
        var submission = new EmployeeAccountantSubmission
        {
            PaymentPersonId = personId, Year = request.Year, Month = request.Month, Reference = request.Reference.Trim(),
            SummaryJson = JsonSerializer.Serialize(summary), RecordedBy = actor
        };
        person.Revision++;
        repository.AddEmployeeAccountantSubmission(submission);
        Audit(personId, submission.Id, "EmployeeAccountantSummaryRegistered", new { }, new { submission.Id, submission.Reference }, "Registro do resumo encaminhado ao contador", actor);
        await repository.SaveChangesAsync(ct);
        return new(submission.Id, personId, submission.Year, submission.Month, submission.Reference, submission.CreatedOn, actor, summary);
    }

    public async Task<IReadOnlyCollection<EmployeeAccountantSubmissionDto>> GetEmployeeAccountantSubmissionsAsync(Guid personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month); await GetEmployee(personId, ct);
        return (await repository.GetEmployeeAccountantSubmissionsAsync(personId, year, month, ct)).Select(x =>
            new EmployeeAccountantSubmissionDto(x.Id, personId, x.Year, x.Month, x.Reference, x.CreatedOn, x.RecordedBy,
                ReadAccountantSummarySnapshot(x.SummaryJson))).ToList();
    }
    public async Task<PaymentExportFileDto> ExportEmployeePaymentsAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, bool bonusesOnly, CancellationToken ct)
    {
        ValidateFortnight(fortnight);
        if (year is < 2000 or > 9999 || month is < 1 or > 12) throw new InvalidOperationException("Competencia invalida.");
        if (personId.HasValue) await GetEmployee(personId.Value, ct);
        if (bonusesOnly)
        {
            if (fortnight == Fortnight.First) throw new InvalidOperationException("Bonificacao somente no fechamento mensal.");
            if (!year.HasValue || !month.HasValue) throw new InvalidOperationException("Informe ano e mes para o relatorio mensal de bonificacao.");
            return await ExportEmployeeBonusReportAsync(personId, year.Value, month.Value, ct);
        }
        var calculations = (await repository.GetHistoryAsync(personId, year, month, fortnight, ct))
            .Where(x => x.EmploymentType == EmploymentType.Employee).ToList();
        var content = pdfReportService.BuildPaymentsReportPdf(calculations, bonusesOnly, year, month, fortnight, PaymentLogoPath());
        return new(content, "application/pdf", ExportFileName(bonusesOnly ? "bonificacoes-funcionarios" : "pagamentos-funcionarios", year, month, fortnight));
    }
    private static AccountantSummaryDto ReadAccountantSummarySnapshot(string json)
    {
        var report = JsonSerializer.Deserialize<AccountantSummaryDto>(json)!;
        using var document = JsonDocument.Parse(json);
        // Old snapshots are retained verbatim in storage. Only the attendance projection is returned to the accountant.
        if (document.RootElement.TryGetProperty("Occurrences", out var occurrences))
        {
            var active = occurrences.EnumerateArray().Where(x => !x.TryGetProperty("IsCancelled", out var cancelled) || !cancelled.GetBoolean())
                .Select(x => new AccountantAbsenceOccurrenceDto(x.GetProperty("Date").Deserialize<DateOnly>(), x.GetProperty("IsHalf").GetBoolean())).ToList();
            report = report with { Occurrences = active };
        }
        return report;
    }
}
