using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Domain.Services.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed class PaymentApplicationService(IPaymentRepository repository, IPdfReportService pdfReportService) : IPaymentApplicationService
{
    public async Task<IReadOnlyCollection<PaymentPersonDto>> GetPeopleAsync(CancellationToken cancellationToken) =>
        (await repository.GetPeopleAsync(cancellationToken)).Select(MapPerson).ToList();

    public async Task<PaymentPersonDto> CreatePersonAsync(CreatePaymentPersonRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) throw new InvalidOperationException("Informe o nome da pessoa.");
        if (!Enum.IsDefined(request.EmploymentType)) throw new InvalidOperationException("Tipo de vinculo invalido.");
        if (request.MonthlyValue <= 0m) throw new InvalidOperationException("O valor-base deve ser maior que zero.");
        if (request.EmployeeId.HasValue && !await repository.EmployeeExistsAsync(request.EmployeeId.Value, cancellationToken)) throw new KeyNotFoundException("Funcionario vinculado nao encontrado.");

        var person = new PaymentPerson { Name = request.Name.Trim(), EmploymentType = request.EmploymentType, MonthlyValue = request.MonthlyValue, EmployeeId = request.EmployeeId };
        await repository.AddPersonAsync(person, cancellationToken);
        return MapPerson(person);
    }

    public async Task UpdateSalaryAsync(Guid personId, UpdateSalaryRequest request, CancellationToken cancellationToken)
    {
        var person = await GetPerson(personId, cancellationToken);
        if (request.MonthlyValue <= 0m) throw new InvalidOperationException("O valor-base deve ser maior que zero.");
        person.MonthlyValue = request.MonthlyValue;
        person.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdatePersonStatusAsync(Guid personId, bool isActive, CancellationToken cancellationToken)
    {
        var person = await GetPerson(personId, cancellationToken);
        person.IsActive = isActive;
        person.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<PaymentRulesDto>> GetRulesAsync(CancellationToken cancellationToken) =>
        (await repository.GetRulesAsync(cancellationToken)).Select(MapRules).ToList();

    public async Task<PaymentRulesDto> CreateRulesAsync(PaymentRulesRequest request, CancellationToken cancellationToken)
    {
        if (request.EmployeeFirstFortnightPercent is < 0m or > 100m || request.ContractorFirstFortnightPercent is < 0m or > 100m) throw new InvalidOperationException("Os percentuais devem estar entre zero e cem.");
        if (request.FullAbsenceValue <= 0m || request.HalfAbsenceValue <= 0m) throw new InvalidOperationException("Os valores de falta devem ser maiores que zero.");
        if (request.MonthlyWorkMinutes is <= 0) throw new InvalidOperationException("A carga mensal deve ser maior que zero.");
        if (request.PositiveHourMultiplier is <= 0m || request.NegativeHourMultiplier is <= 0m || request.NightHourMultiplier is <= 0m) throw new InvalidOperationException("Os multiplicadores devem ser maiores que zero.");
        if ((await repository.GetRulesAsync(cancellationToken)).Any(x => x.EffectiveFrom == request.EffectiveFrom)) throw new InvalidOperationException("Ja existe uma regra com esta data de vigencia.");
        var entity = new PaymentRuleConfiguration
        {
            EffectiveFrom = request.EffectiveFrom,
            EmployeeFirstFortnightPercent = request.EmployeeFirstFortnightPercent,
            ContractorFirstFortnightPercent = request.ContractorFirstFortnightPercent,
            FullAbsenceValue = request.FullAbsenceValue,
            HalfAbsenceValue = request.HalfAbsenceValue,
            MonthlyWorkMinutes = request.MonthlyWorkMinutes,
            PositiveHourMultiplier = request.PositiveHourMultiplier,
            NegativeHourMultiplier = request.NegativeHourMultiplier,
            NightHourMultiplier = request.NightHourMultiplier
        };
        await repository.AddRulesAsync(entity, cancellationToken);
        return MapRules(entity);
    }

    public async Task<IReadOnlyCollection<VoucherDto>> GetVouchersAsync(Guid? personId, CancellationToken cancellationToken) =>
        (await repository.GetVouchersAsync(personId, cancellationToken)).Select(MapVoucher).ToList();

    public async Task<VoucherDto> CreateVoucherAsync(CreateVoucherRequest request, CancellationToken cancellationToken)
    {
        await GetPerson(request.PaymentPersonId, cancellationToken);
        if (string.IsNullOrWhiteSpace(request.Description) || request.InstallmentValue <= 0m) throw new InvalidOperationException("Informe descricao e valor de desconto validos.");
        if (request.TotalValue is <= 0m) throw new InvalidOperationException("O valor total deve ser maior que zero.");
        if (request.TotalValue.HasValue && request.InstallmentValue > request.TotalValue.Value) throw new InvalidOperationException("A parcela nao pode ser maior que o valor total.");
        ValidateCompetence(request.StartYear, request.StartMonth);
        if (!Enum.IsDefined(request.Periodicity)) throw new InvalidOperationException("Periodicidade invalida.");
        if (request.IntervalMonths <= 0) throw new InvalidOperationException("O intervalo deve ser maior que zero.");
        if (request.InstallmentCount is <= 0) throw new InvalidOperationException("A quantidade de parcelas deve ser maior que zero.");
        if (request.Periodicity == VoucherPeriodicity.Custom && (request.Competences is null || request.Competences.Count == 0)) throw new InvalidOperationException("Informe as competencias do vale personalizado.");

        var voucher = new Voucher
        {
            PaymentPersonId = request.PaymentPersonId,
            Description = request.Description.Trim(),
            TotalValue = request.TotalValue,
            RemainingBalance = request.TotalValue,
            InstallmentValue = request.InstallmentValue,
            Date = request.Date,
            StartYear = request.StartYear,
            StartMonth = request.StartMonth,
            Periodicity = request.Periodicity,
            IntervalMonths = request.IntervalMonths,
            InstallmentCount = request.InstallmentCount
        };
        foreach (var competence in request.Competences ?? Array.Empty<VoucherCompetenceRequest>())
        {
            ValidateCompetence(competence.Year, competence.Month);
            if (voucher.Competences.Any(x => x.Year == competence.Year && x.Month == competence.Month)) throw new InvalidOperationException("Nao repita competencias no mesmo vale.");
            voucher.Competences.Add(new VoucherCompetence { VoucherId = voucher.Id, Year = competence.Year, Month = competence.Month, Skip = competence.Skip });
        }
        await repository.AddVoucherAsync(voucher, cancellationToken);
        return MapVoucher(await repository.GetVoucherAsync(voucher.Id, cancellationToken) ?? voucher);
    }

    public async Task UpdateVoucherStatusAsync(Guid voucherId, VoucherStatus status, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(status)) throw new InvalidOperationException("Status de vale invalido.");
        var voucher = await repository.GetVoucherAsync(voucherId, cancellationToken) ?? throw new KeyNotFoundException("Vale nao encontrado.");
        voucher.Status = status;
        voucher.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<PaymentPreviewDto> PreviewAsync(CalculatePaymentRequest request, CancellationToken cancellationToken) => (await Calculate(request, cancellationToken)).Preview;

    public async Task<PaymentHistoryDto> ConfirmAsync(CalculatePaymentRequest request, CancellationToken cancellationToken)
    {
        if (await repository.GetCalculationAsync(request.PaymentPersonId, request.CompetenceYear, request.CompetenceMonth, request.Fortnight, cancellationToken) is not null) throw new InvalidOperationException("Ja existe um calculo confirmado para esta pessoa, competencia e quinzena.");
        var calculated = await Calculate(request, cancellationToken);
        var firstValue = request.Fortnight == Fortnight.First ? calculated.Preview.NetValue : calculated.FirstCalculation!.NetValue;
        var secondValue = request.Fortnight == Fortnight.Second ? calculated.Preview.NetValue : 0m;
        var entity = new PaymentCalculation
        {
            PaymentPersonId = calculated.Person.Id,
            PaymentRuleConfigurationId = calculated.Rules.Id,
            PersonName = calculated.Person.Name,
            EmploymentType = calculated.Person.EmploymentType,
            CompetenceYear = request.CompetenceYear,
            CompetenceMonth = request.CompetenceMonth,
            Fortnight = request.Fortnight,
            BaseValue = calculated.Preview.BaseValue,
            FortnightPercent = calculated.Preview.FortnightPercent,
            FirstFortnightPaid = calculated.Preview.FirstFortnightPaid,
            GrossValue = calculated.Preview.GrossValue,
            AdditionValue = calculated.Preview.AdditionValue,
            DeductionValue = calculated.Preview.DeductionValue,
            NetValue = calculated.Preview.NetValue,
            FirstFortnightValue = firstValue,
            SecondFortnightValue = secondValue,
            MonthlyTotalValue = firstValue + secondValue,
            CalculatedAt = DateTime.UtcNow
        };
        entity.Items = calculated.Preview.Items.Select(x => new PaymentCalculationItem { PaymentCalculationId = entity.Id, Kind = x.Kind, Description = x.Description, Amount = x.Amount, QuantityMinutes = x.QuantityMinutes, Quantity = x.Quantity, VoucherId = x.VoucherId }).ToList();
        foreach (var item in entity.Items.Where(x => x.Kind == PaymentItemKind.Voucher && x.VoucherId.HasValue))
        {
            var voucher = calculated.Vouchers.Single(x => x.Id == item.VoucherId);
            voucher.AppliedInstallments++;
            if (voucher.RemainingBalance.HasValue) voucher.RemainingBalance = Math.Max(0m, voucher.RemainingBalance.Value - item.Amount);
            if ((voucher.RemainingBalance.HasValue && voucher.RemainingBalance.Value == 0m) || (voucher.InstallmentCount.HasValue && voucher.AppliedInstallments >= voucher.InstallmentCount.Value)) voucher.Status = VoucherStatus.PaidOff;
        }
        await repository.AddCalculationAsync(entity, cancellationToken);
        return MapHistory(entity);
    }

    public async Task<IReadOnlyCollection<PaymentHistoryDto>> GetHistoryAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken) =>
        (await repository.GetHistoryAsync(personId, year, month, fortnight, cancellationToken)).Select(MapHistory).ToList();

    public async Task<PaymentExportFileDto> ExportPaymentsAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken)
    {
        ValidateFortnight(fortnight);
        var calculations = await repository.GetHistoryAsync(personId, year, month, fortnight, cancellationToken);
        var content = pdfReportService.BuildPaymentsReportPdf(calculations, false, year, month, fortnight, PaymentLogoPath());
        return new(content, "application/pdf", ExportFileName("pagamentos", year, month, fortnight));
    }

    public async Task<PaymentExportFileDto> ExportBonusesAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken)
    {
        ValidateFortnight(fortnight);
        var calculations = await repository.GetHistoryAsync(personId, year, month, fortnight, cancellationToken);
        var content = pdfReportService.BuildPaymentsReportPdf(calculations, true, year, month, fortnight, PaymentLogoPath());
        return new(content, "application/pdf", ExportFileName("bonificacoes", year, month, fortnight));
    }

    public async Task MarkPaidAsync(Guid calculationId, DateTime paidAt, CancellationToken cancellationToken)
    {
        if (paidAt == default) throw new InvalidOperationException("Informe a data do pagamento.");
        var calculation = await repository.GetCalculationAsync(calculationId, cancellationToken) ?? throw new KeyNotFoundException("Calculo nao encontrado.");
        if (calculation.Status == PaymentCalculationStatus.Cancelled) throw new InvalidOperationException("Um calculo cancelado nao pode ser marcado como pago.");
        calculation.Status = PaymentCalculationStatus.Paid;
        calculation.PaidAt = paidAt.Kind == DateTimeKind.Utc ? paidAt : paidAt.ToUniversalTime();
        calculation.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    private async Task<CalculationContext> Calculate(CalculatePaymentRequest request, CancellationToken cancellationToken)
    {
        ValidateCompetence(request.CompetenceYear, request.CompetenceMonth);
        if (!Enum.IsDefined(request.Fortnight)) throw new InvalidOperationException("Quinzena invalida.");
        ValidateManualEntries(request.Additions);
        ValidateManualEntries(request.Deductions);
        var person = await GetPerson(request.PaymentPersonId, cancellationToken);
        if (!person.IsActive) throw new InvalidOperationException("A pessoa esta inativa para pagamentos.");
        var effectiveDate = request.Fortnight == Fortnight.First ? new DateOnly(request.CompetenceYear, request.CompetenceMonth, 15) : new DateOnly(request.CompetenceYear, request.CompetenceMonth, DateTime.DaysInMonth(request.CompetenceYear, request.CompetenceMonth));
        var rules = (await repository.GetRulesAsync(cancellationToken)).Where(x => x.EffectiveFrom <= effectiveDate).OrderByDescending(x => x.EffectiveFrom).FirstOrDefault() ?? throw new InvalidOperationException("Nao existe regra de pagamento vigente para esta competencia.");
        var firstCalculation = request.Fortnight == Fortnight.Second ? await repository.GetCalculationAsync(person.Id, request.CompetenceYear, request.CompetenceMonth, Fortnight.First, cancellationToken) ?? throw new InvalidOperationException("Confirme a primeira quinzena antes de calcular a segunda.") : null;
        var vouchers = request.Fortnight == Fortnight.Second
            ? (await repository.GetVouchersAsync(person.Id, cancellationToken)).Where(x => IsVoucherApplicable(x, request.CompetenceYear, request.CompetenceMonth)).Where(x => request.ExcludedVoucherIds?.Contains(x.Id) != true).ToList()
            : new List<Voucher>();
        var voucherEntries = vouchers.Select(x => new PaymentEntry(x.Description, x.RemainingBalance.HasValue ? Math.Min(x.InstallmentValue, x.RemainingBalance.Value) : x.InstallmentValue, x.Id)).ToList();
        var input = new PaymentCalculationInput(person.EmploymentType, request.Fortnight, person.MonthlyValue, request.BonusValue, firstCalculation?.NetValue ?? 0m, request.FullAbsences, request.HalfAbsences, request.PositiveMinutes, request.NegativeMinutes, request.NightMinutes, voucherEntries, MapEntries(request.Additions), MapEntries(request.Deductions));
        var result = PaymentCalculator.Calculate(input, new PaymentRules(rules.EmployeeFirstFortnightPercent, rules.ContractorFirstFortnightPercent, rules.FullAbsenceValue, rules.HalfAbsenceValue, rules.MonthlyWorkMinutes, rules.PositiveHourMultiplier, rules.NegativeHourMultiplier, rules.NightHourMultiplier));
        var preview = new PaymentPreviewDto(person.Id, person.Name, person.EmploymentType, request.CompetenceYear, request.CompetenceMonth, request.Fortnight, person.MonthlyValue, result.FortnightPercent, firstCalculation?.NetValue ?? 0m, result.GrossValue, result.AdditionValue, result.DeductionValue, result.NetValue, result.Items.Select(x => new PaymentItemDto(x.Kind, x.Description, x.Amount, x.QuantityMinutes, x.Quantity, x.VoucherId)).ToList());
        return new(person, rules, firstCalculation, vouchers, preview);
    }

    private static bool IsVoucherApplicable(Voucher voucher, int year, int month)
    {
        if (voucher.Status != VoucherStatus.Active || (voucher.InstallmentCount.HasValue && voucher.AppliedInstallments >= voucher.InstallmentCount.Value) || voucher.RemainingBalance is <= 0m) return false;
        var difference = year * 12 + month - 1 - (voucher.StartYear * 12 + voucher.StartMonth - 1);
        if (difference < 0) return false;
        return voucher.Periodicity switch
        {
            VoucherPeriodicity.Monthly => true,
            VoucherPeriodicity.AlternateMonths => difference % 2 == 0,
            VoucherPeriodicity.EveryXMonths => difference % voucher.IntervalMonths == 0,
            VoucherPeriodicity.Single => difference == 0,
            VoucherPeriodicity.Custom => voucher.Competences.Any(x => x.Year == year && x.Month == month && !x.Skip),
            _ => false
        };
    }

    private async Task<PaymentPerson> GetPerson(Guid id, CancellationToken cancellationToken) => await repository.GetPersonAsync(id, cancellationToken) ?? throw new KeyNotFoundException("Pessoa de pagamento nao encontrada.");
    private static IReadOnlyCollection<PaymentEntry> MapEntries(IReadOnlyCollection<ManualPaymentEntryRequest>? entries) => entries is null ? Array.Empty<PaymentEntry>() : entries.Select(x => new PaymentEntry(x.Description.Trim(), x.Amount)).ToList();
    private static void ValidateManualEntries(IReadOnlyCollection<ManualPaymentEntryRequest>? entries) { if (entries?.Any(x => string.IsNullOrWhiteSpace(x.Description)) == true) throw new InvalidOperationException("Informe a descricao dos ajustes manuais."); }
    private static void ValidateCompetence(int year, int month) { if (year < 2000 || year > 9999 || month is < 1 or > 12) throw new InvalidOperationException("Competencia invalida."); }
    private static void ValidateFortnight(Fortnight? fortnight) { if (fortnight.HasValue && !Enum.IsDefined(fortnight.Value)) throw new InvalidOperationException("Quinzena invalida. Use 1 para a primeira ou 2 para a segunda."); }
    private static PaymentPersonDto MapPerson(PaymentPerson person) => new(person.Id, person.Name, person.EmploymentType, person.IsActive, person.MonthlyValue);
    private static string PaymentLogoPath() => Path.Combine(AppContext.BaseDirectory, "Assets", "logo-cjm.png");
    private static string ExportFileName(string prefix, int? year, int? month, Fortnight? fortnight)
    {
        var period = year.HasValue && month.HasValue ? $"{year}-{month:00}" : year.HasValue ? year.Value.ToString() : DateTime.UtcNow.ToString("yyyyMMdd");
        var fortnightSuffix = fortnight.HasValue ? $"-{(int)fortnight.Value}a-quinzena" : string.Empty;
        return $"{prefix}-{period}{fortnightSuffix}.pdf";
    }
    private static PaymentRulesDto MapRules(PaymentRuleConfiguration x) => new(x.Id, x.EffectiveFrom, x.EmployeeFirstFortnightPercent, x.ContractorFirstFortnightPercent, x.FullAbsenceValue, x.HalfAbsenceValue, x.MonthlyWorkMinutes, x.PositiveHourMultiplier, x.NegativeHourMultiplier, x.NightHourMultiplier);
    private static VoucherDto MapVoucher(Voucher x) => new(x.Id, x.PaymentPersonId, x.PaymentPerson?.Name ?? string.Empty, x.Description, x.TotalValue, x.InstallmentValue, x.RemainingBalance, x.StartYear, x.StartMonth, x.Periodicity, x.IntervalMonths, x.InstallmentCount, x.AppliedInstallments, x.Status);
    private static PaymentHistoryDto MapHistory(PaymentCalculation x) => new(x.Id, x.PaymentPersonId, x.PersonName, x.EmploymentType, x.CompetenceYear, x.CompetenceMonth, x.Fortnight, x.BaseValue, x.NetValue, x.FirstFortnightValue, x.SecondFortnightValue, x.MonthlyTotalValue, x.Status, x.CalculatedAt, x.PaidAt, x.Items.Select(i => new PaymentItemDto(i.Kind, i.Description, i.Amount, i.QuantityMinutes, i.Quantity, i.VoucherId)).ToList());
    private sealed record CalculationContext(PaymentPerson Person, PaymentRuleConfiguration Rules, PaymentCalculation? FirstCalculation, List<Voucher> Vouchers, PaymentPreviewDto Preview);
}
