using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Domain.Services.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed partial class PaymentApplicationService(IPaymentRepository repository, IPdfReportService pdfReportService) : IPaymentApplicationService
{
    public async Task<IReadOnlyCollection<PaymentPersonDto>> GetPeopleAsync(CancellationToken cancellationToken) =>
        (await repository.GetPeopleAsync(cancellationToken)).Select(MapPerson).ToList();

    public async Task<PaymentPersonDto> CreatePersonAsync(CreatePaymentPersonRequest request, CancellationToken cancellationToken, string actor = "system")
    {
        if (request.Name?.Length > 150) throw new InvalidOperationException("Nome excede 150 caracteres.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new InvalidOperationException("Informe o nome da pessoa.");
        if (!Enum.IsDefined(request.EmploymentType)) throw new InvalidOperationException("Tipo de vinculo invalido.");
        if (decimal.Round(request.MonthlyValue, 2) != request.MonthlyValue || request.MonthlyBonus is decimal bonus && decimal.Round(bonus, 2) != bonus) throw new InvalidOperationException("Use no maximo duas casas decimais.");
        if (request.MonthlyValue <= 0m) throw new InvalidOperationException("O valor-base deve ser maior que zero.");

        if (request.MonthlyBonus < 0m) throw new InvalidOperationException("Bonificacao negativa.");
        var person = new PaymentPerson { MonthlyBonus = request.MonthlyBonus, ContractualDsrAuthorized = request.ContractualDsrAuthorized, AdmissionDate = request.AdmissionDate, Name = request.Name.Trim(), EmploymentType = request.EmploymentType, MonthlyValue = request.MonthlyValue };
        Audit(person.Id, person.Id, "PersonCreated", new { }, request, "Cadastro", actor);
        await repository.AddPersonAsync(person, cancellationToken);
        return MapPerson(person);
    }

    public async Task UpdateSalaryAsync(Guid personId, UpdateSalaryRequest request, CancellationToken cancellationToken, string actor = "system")
    {
        var person = await GetPerson(personId, cancellationToken);
        if (person.IsDeleted) throw new InvalidOperationException("Trabalhador excluido.");
        if (decimal.Round(request.MonthlyValue, 2) != request.MonthlyValue || request.MonthlyBonus is decimal bonus && decimal.Round(bonus, 2) != bonus) throw new InvalidOperationException("Use no maximo duas casas decimais.");
        if (request.MonthlyValue <= 0m) throw new InvalidOperationException("O valor-base deve ser maior que zero.");
        if (request.MonthlyBonus < 0m) throw new InvalidOperationException("Bonificacao negativa.");
        Audit(person.Id, person.Id, "ContractUpdated", new { person.MonthlyValue, person.MonthlyBonus, person.AdmissionDate }, request, "Atualizacao cadastral", actor);
        person.MonthlyBonus = request.MonthlyBonus ?? person.MonthlyBonus; person.AdmissionDate = request.AdmissionDate ?? person.AdmissionDate; person.ContractualDsrAuthorized = request.ContractualDsrAuthorized ?? person.ContractualDsrAuthorized; person.Revision++;
        person.MonthlyValue = request.MonthlyValue;
        person.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdatePersonStatusAsync(Guid personId, bool isActive, CancellationToken cancellationToken, string actor = "system")
    {
        var person = await GetPerson(personId, cancellationToken);
        if (person.IsDeleted) throw new InvalidOperationException("Trabalhador excluido.");
        Audit(person.Id, person.Id, "StatusUpdated", new { person.IsActive }, new { IsActive = isActive }, "Situacao cadastral", actor);
        person.Revision++; person.IsActive = isActive;
        person.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<PaymentRulesDto>> GetRulesAsync(CancellationToken cancellationToken) =>
        (await repository.GetRulesAsync(cancellationToken)).Select(MapRules).ToList();

    public async Task<PaymentRulesDto> CreateRulesAsync(PaymentRulesRequest request, CancellationToken cancellationToken)
    {
        if (request.EmployeeFirstFortnightPercent != 40m || request.ContractorFirstFortnightPercent != 50m) throw new InvalidOperationException("Use 40% para funcionarios e 50% para prestadores.");
        if (request.FullAbsenceValue < 0m || request.HalfAbsenceValue < 0m) throw new InvalidOperationException("Os valores de falta devem ser maiores que zero.");
        if (request.EffectiveFrom.Year < 2000) throw new InvalidOperationException("Informe a data de vigencia.");
        foreach (var value in new decimal?[] { request.FullAbsenceValue, request.HalfAbsenceValue, request.ContractorAbsenceDailyValue, request.ContractorDsrValue }) if (value.HasValue && decimal.Round(value.Value, 2) != value.Value) throw new InvalidOperationException("Valores monetarios devem ter ate duas casas decimais.");
        if (request.MonthlyWorkMinutes is <= 0) throw new InvalidOperationException("A carga mensal deve ser maior que zero.");
        if (request.PositiveHourMultiplier is <= 0m || request.NegativeHourMultiplier is <= 0m || request.NightHourMultiplier is <= 0m) throw new InvalidOperationException("Os multiplicadores devem ser maiores que zero.");
        if ((await repository.GetRulesAsync(cancellationToken)).Any(x => x.EffectiveFrom == request.EffectiveFrom)) throw new InvalidOperationException("Ja existe uma regra com esta data de vigencia.");
        if (request.ContractorAbsenceDailyValue is <= 0m || request.ContractorDsrValue is <= 0m) throw new InvalidOperationException("Valores contratuais devem ser positivos ou nulos (desativados).");
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
            NightHourMultiplier = request.NightHourMultiplier,
            ContractorAbsenceDailyValue = request.ContractorAbsenceDailyValue,
            ContractorDsrValue = request.ContractorDsrValue,
            HalfAbsenceGeneratesDsr = request.HalfAbsenceGeneratesDsr
        };
        await repository.AddRulesAsync(entity, cancellationToken);
        return MapRules(entity);
    }

    public async Task<IReadOnlyCollection<VoucherDto>> GetVouchersAsync(Guid? personId, CancellationToken cancellationToken) =>
        (await repository.GetVouchersAsync(personId, cancellationToken)).Select(MapVoucher).ToList();

    public async Task<VoucherDto> CreateVoucherAsync(CreateVoucherRequest request, CancellationToken cancellationToken)
    {
        var person = await GetPerson(request.PaymentPersonId, cancellationToken);
        if (person.IsDeleted) throw new InvalidOperationException("Trabalhador excluido.");
        if (string.IsNullOrWhiteSpace(request.Description) || request.InstallmentValue <= 0m) throw new InvalidOperationException("Informe descricao e valor de desconto validos.");
        if (request.TotalValue is <= 0m) throw new InvalidOperationException("O valor total deve ser maior que zero.");
        if (request.TotalValue.HasValue && request.InstallmentValue > request.TotalValue.Value) throw new InvalidOperationException("A parcela nao pode ser maior que o valor total.");
        ValidateCompetence(request.StartYear, request.StartMonth);
        if (!Enum.IsDefined(request.Periodicity)) throw new InvalidOperationException("Periodicidade invalida.");
        if (request.IntervalMonths <= 0) throw new InvalidOperationException("O intervalo deve ser maior que zero.");
        if (request.InstallmentCount is <= 0) throw new InvalidOperationException("A quantidade de parcelas deve ser maior que zero.");
        if (request.Periodicity == VoucherPeriodicity.Custom && (request.Competences is null || request.Competences.Count == 0)) throw new InvalidOperationException("Informe as competencias do vale personalizado.");

        if (person.EmploymentType == EmploymentType.Employee)
        {
            if (!request.TotalValue.HasValue) throw new InvalidOperationException("Informe o valor total finito do vale do funcionario.");
            ValidateEmployeeMoney(request.TotalValue.Value, false);
            ValidateEmployeeMoney(request.InstallmentValue, false);
            if (request.Date == default || request.Date.Year < 2000) throw new InvalidOperationException("Informe a data de concessao do vale.");
        }
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
            AllowPartialDiscount = person.EmploymentType == EmploymentType.Employee && request.AllowPartialDiscount,
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
        voucher.Revision++; voucher.Status = status;
        voucher.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<PaymentPreviewDto> PreviewAsync(CalculatePaymentRequest request, CancellationToken cancellationToken)
    {
        ValidateCompetence(request.CompetenceYear, request.CompetenceMonth); ValidateFortnight(request.Fortnight);
        var saved = await repository.GetCalculationAsync(request.PaymentPersonId, request.CompetenceYear, request.CompetenceMonth, request.Fortnight, cancellationToken);
        if (saved != null) return new(saved.PaymentPersonId, saved.PersonName, saved.EmploymentType, saved.CompetenceYear, saved.CompetenceMonth, saved.Fortnight, saved.BaseValue, saved.FortnightPercent, saved.FirstFortnightPaid, saved.GrossValue, saved.AdditionValue, saved.DeductionValue, saved.NetValue, saved.Items.Select(i => new PaymentItemDto(i.Kind, i.Description, i.Amount, i.QuantityMinutes, i.Quantity, i.VoucherId, i.AbsenceId, i.DsrWeekStart)).ToList()) { EmployeeSettlement = EmployeeSettlementFromSnapshot(saved) };
        return (await Calculate(request, cancellationToken)).Preview;
    }

    public async Task<PaymentHistoryDto> ConfirmAsync(CalculatePaymentRequest request, CancellationToken cancellationToken, string actor = "system")
    {
        if (await repository.GetCalculationAsync(request.PaymentPersonId, request.CompetenceYear, request.CompetenceMonth, request.Fortnight, cancellationToken) is not null) throw new InvalidOperationException("Ja existe um calculo confirmado para esta pessoa, competencia e quinzena.");
        var calculated = await Calculate(request, cancellationToken);
        if (calculated.Person.EmploymentType == EmploymentType.Employee && request.Fortnight == Fortnight.Second)
        {
            if (!request.AccountantAmount.HasValue) throw new InvalidOperationException("Informe o fechamento retornado pelo contador antes de confirmar.");
            if (calculated.FirstCalculation?.Status != PaymentCalculationStatus.Paid) throw new InvalidOperationException("Registre o pagamento da primeira quinzena antes de fechar a segunda.");
        }
        var preparation = await repository.GetPreparationAsync(request.PaymentPersonId, request.CompetenceYear, request.CompetenceMonth, request.Fortnight, cancellationToken);
        if (preparation != null) { preparation.Status = PaymentCalculationStatus.Calculated; preparation.Revision++; }
        calculated.Person.Revision++;
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
            EmployeePaymentFlowVersion = calculated.Person.EmploymentType == EmploymentType.Employee ? 1 : null,
            EmployeeAccountantAmount = calculated.Preview.EmployeeSettlement?.AccountantProvidedAmount,
            EmployeeAccountantReference = calculated.Preview.EmployeeSettlement?.AccountantReference,
            EmployeeAccountantNotes = calculated.Preview.EmployeeSettlement?.AccountantNotes,
            EmployeeFirstGrossValue = calculated.Preview.EmployeeSettlement?.FirstFortnightAccountantAmount,
            EmployeeFirstPaidAt = calculated.Preview.EmployeeSettlement?.FirstFortnightPaidAt,
            CalculatedAt = DateTime.UtcNow
        };
        entity.Items = calculated.Preview.Items.Select(x => new PaymentCalculationItem { PaymentCalculationId = entity.Id, Kind = x.Kind, Description = x.Description, Amount = x.Amount, QuantityMinutes = x.QuantityMinutes, Quantity = x.Quantity, VoucherId = x.VoucherId, AbsenceId = x.AbsenceId, DsrWeekStart = x.DsrWeekStart }).ToList();
        foreach (var item in entity.Items.Where(x => x.Kind == PaymentItemKind.Voucher && x.VoucherId.HasValue))
        {
            var voucher = calculated.Vouchers.Single(x => x.Id == item.VoucherId);
            if (calculated.Person.EmploymentType == EmploymentType.Employee)
            {
                if (!voucher.RemainingBalance.HasValue || item.Amount > voucher.RemainingBalance.Value) throw new InvalidOperationException("Saldo do vale insuficiente.");
                voucher.Revision++;
                voucher.AppliedInstallments++;
                voucher.RemainingBalance -= item.Amount;
                if (voucher.RemainingBalance == 0) voucher.Status = VoucherStatus.PaidOff;
                continue;
            }
            voucher.Revision++; voucher.AppliedInstallments++;
            if (voucher.RemainingBalance.HasValue) voucher.RemainingBalance = Math.Max(0m, voucher.RemainingBalance.Value - item.Amount);
            if ((voucher.RemainingBalance.HasValue && voucher.RemainingBalance.Value == 0m) || (voucher.InstallmentCount.HasValue && voucher.AppliedInstallments >= voucher.InstallmentCount.Value)) voucher.Status = VoucherStatus.PaidOff;
        }
        foreach (var item in entity.Items.Where(x => x.DsrWeekStart.HasValue))
            repository.AddDsrCharge(new PaymentDsrCharge { PaymentPersonId = entity.PaymentPersonId, PaymentCalculationId = entity.Id, WeekStart = item.DsrWeekStart!.Value, Amount = item.Amount, AbsenceIds = calculated.DsrSources[item.DsrWeekStart.Value] });
        Audit(entity.PaymentPersonId, entity.Id, "CalculationClosed", new { }, new { entity.NetValue, entity.GrossValue, entity.DeductionValue }, "Fechamento", actor);
        if (entity.EmploymentType == EmploymentType.Employee && entity.Fortnight == Fortnight.Second)
        {
            var bonus = await BuildEmployeeBonusAsync(calculated.Person, entity.CompetenceYear, entity.CompetenceMonth, cancellationToken);
            bonus.PaymentCalculationId = entity.Id;
            repository.AddEmployeeBonus(bonus);
            Audit(entity.PaymentPersonId, bonus.Id, "EmployeeBonusClosedSeparately", new { }, new { bonus.OriginalValue, bonus.DeductionValue, bonus.NetValue }, "Bonificacao separada do salario", actor);
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

    public async Task MarkPaidAsync(Guid calculationId, DateTime paidAt, CancellationToken cancellationToken, string actor = "system")
    {
        if (paidAt == default) throw new InvalidOperationException("Informe a data do pagamento.");
        var calculation = await repository.GetCalculationAsync(calculationId, cancellationToken) ?? throw new KeyNotFoundException("Calculo nao encontrado.");
        if (calculation.Status == PaymentCalculationStatus.Cancelled) throw new InvalidOperationException("Um calculo cancelado nao pode ser marcado como pago.");
        if (calculation.Status == PaymentCalculationStatus.Paid) throw new InvalidOperationException("Pagamento ja registrado.");
        if (calculation.Status != PaymentCalculationStatus.Calculated) throw new InvalidOperationException("Feche a apuracao antes de pagar.");
        Audit(calculation.PaymentPersonId, calculation.Id, "PaymentRecorded", new { calculation.PaidAt }, new { PaidAt = paidAt }, "Pagamento", actor);
        calculation.Revision++;
        calculation.Status = PaymentCalculationStatus.Paid;
        calculation.PaidAt = paidAt.Kind == DateTimeKind.Utc ? paidAt : paidAt.ToUniversalTime();
        calculation.ModifiedOn = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }

    private async Task<CalculationContext> Calculate(CalculatePaymentRequest request, CancellationToken cancellationToken)
    {
        ValidateCompetence(request.CompetenceYear, request.CompetenceMonth);
        if (!Enum.IsDefined(request.Fortnight)) throw new InvalidOperationException("Quinzena invalida.");
        if (request.FullAbsences != 0 || request.HalfAbsences != 0 || request.BonusValue != 0m)
            throw new InvalidOperationException("Cadastre as faltas por data e a bonificacao no trabalhador; quantidades avulsas nao sao aceitas.");
        ValidateManualEntries(request.Additions); ValidateManualEntries(request.Deductions);
        var person = await GetPerson(request.PaymentPersonId, cancellationToken);
        if (!person.IsActive) throw new InvalidOperationException("Pessoa inativa.");
        var monthStart = new DateOnly(request.CompetenceYear, request.CompetenceMonth, 1);
        var from = request.Fortnight == Fortnight.First ? monthStart : monthStart.AddDays(15);
        var end = request.Fortnight == Fortnight.First ? monthStart.AddDays(14) : monthStart.AddDays(DateTime.DaysInMonth(request.CompetenceYear, request.CompetenceMonth) - 1);
        var rules = (await repository.GetRulesAsync(cancellationToken)).Where(x => x.EffectiveFrom <= end).OrderByDescending(x => x.EffectiveFrom).FirstOrDefault() ?? throw new InvalidOperationException("Sem regra vigente.");
        var first = request.Fortnight == Fortnight.Second ? await repository.GetCalculationAsync(person.Id, request.CompetenceYear, request.CompetenceMonth, Fortnight.First, cancellationToken) : null;
        if (request.Fortnight == Fortnight.Second && (first == null || first.Status is not (PaymentCalculationStatus.Calculated or PaymentCalculationStatus.Paid))) throw new InvalidOperationException("Feche a primeira quinzena antes da segunda.");
        var absences = (await repository.GetAbsencesAsync(person.Id, PaymentWeek.Start(monthStart), end, cancellationToken)).Where(x => !x.IsCancelled).ToList();
        var monthly = absences.Where(x => x.Date >= monthStart).ToList();
        var financialHistory = await repository.GetHistoryAsync(person.Id, null, null, null, cancellationToken);
        var historicalItems = financialHistory.Where(x => x.Status is PaymentCalculationStatus.Calculated or PaymentCalculationStatus.Paid).SelectMany(x => x.Items).ToList();
        var previouslyDeducted = historicalItems.Where(x => x.Kind is PaymentItemKind.FullAbsence or PaymentItemKind.HalfAbsence)
            .Where(x => x.AbsenceId.HasValue).Select(x => x.AbsenceId!.Value).ToHashSet();
        var previousBonusOrigins = historicalItems.Where(x => x.Kind == PaymentItemKind.BonusAbsenceDeduction && x.AbsenceId.HasValue).Select(x => x.AbsenceId!.Value).ToHashSet();
        var bonusAbsences = monthly.Where(x => !previousBonusOrigins.Contains(x.Id)).ToList();
        var period = monthly.Where(x => x.Date >= from && !previouslyDeducted.Contains(x.Id)).ToList();
        var employee = person.EmploymentType == EmploymentType.Employee;
        List<Voucher> vouchers;
        List<PaymentEntry> voucherEntries;
        if (employee)
        {
            (vouchers, voucherEntries) = await SelectEmployeeVouchers(person, request, cancellationToken);
            if (request.AccountantAmountMode != EmployeeAccountantAmountMode.SalaryBalance) throw new InvalidOperationException("O formato alternativo antigo foi removido para funcionarios. Informe o valor original do contador, sem ajustes automaticos.");
            if (request.AccountantReference?.Length > 150 || request.AccountantNotes?.Length > 2000) throw new InvalidOperationException("Referencia ou observacao do contador excede o limite.");
            if (request.AccountantAmount.HasValue) ValidateEmployeeMoney(request.AccountantAmount.Value);
            foreach (var entry in (request.Additions ?? []).Concat(request.Deductions ?? [])) ValidateEmployeeMoney(entry.Amount, false);
        }
        else
        {
            vouchers = request.Fortnight == Fortnight.Second
                ? (await repository.GetVouchersAsync(person.Id, cancellationToken)).Where(x => IsVoucherApplicable(x, request.CompetenceYear, request.CompetenceMonth)).Where(x => request.ExcludedVoucherIds?.Contains(x.Id) != true).ToList() : new List<Voucher>();
            voucherEntries = vouchers.Select(x => new PaymentEntry(x.Description, x.RemainingBalance.HasValue ? Math.Min(x.InstallmentValue, x.RemainingBalance.Value) : x.InstallmentValue, x.Id)).ToList();
        }
        var firstGross = first?.Items.Where(x => x.Kind == PaymentItemKind.FortnightBase).Sum(x => x.Amount) ?? 0;
        var monthlyValue = person.MonthlyValue;
        var input = new PaymentCalculationInput(person.EmploymentType, request.Fortnight, monthlyValue, person.MonthlyBonus, first?.NetValue ?? 0m, period.Count(x => !x.IsHalf), period.Count(x => x.IsHalf), request.PositiveMinutes, request.NegativeMinutes, request.NightMinutes, voucherEntries, MapEntries(request.Additions), MapEntries(request.Deductions), request.AccountantAmount, bonusAbsences.Count(x => !x.IsHalf), bonusAbsences.Count(x => x.IsHalf), employee && first != null ? firstGross : null);
        var calculationRules = new PaymentRules(rules.EmployeeFirstFortnightPercent, rules.ContractorFirstFortnightPercent, rules.FullAbsenceValue, rules.HalfAbsenceValue, rules.MonthlyWorkMinutes, rules.PositiveHourMultiplier, rules.NegativeHourMultiplier, rules.NightHourMultiplier, rules.ContractorAbsenceDailyValue);
        var result = PaymentCalculator.Calculate(input, calculationRules);
        var items = result.Items.Select(x => new PaymentItemDto(x.Kind, x.Description, x.Amount, x.QuantityMinutes, x.Quantity, x.VoucherId)).ToList();
        // Replace aggregate absence items with dated, traceable occurrences.
        items.RemoveAll(x => x.Kind is PaymentItemKind.FullAbsence or PaymentItemKind.HalfAbsence or PaymentItemKind.BonusAbsenceDeduction);
        if (person.EmploymentType == EmploymentType.Contractor && rules.ContractorAbsenceDailyValue.HasValue)
            foreach (var absence in period) items.Add(new(absence.IsHalf ? PaymentItemKind.HalfAbsence : PaymentItemKind.FullAbsence, $"Falta {absence.Date:yyyy-MM-dd}", Money(rules.ContractorAbsenceDailyValue.Value * (absence.IsHalf ? 0.5m : 1m)), null, absence.IsHalf ? 0.5m : 1m, null, absence.Id));
        if (!employee && request.Fortnight == Fortnight.Second)
        {
            var remaining = person.MonthlyBonus;
            foreach (var absence in bonusAbsences)
            {
                var deduction = Math.Min(remaining, absence.IsHalf ? rules.HalfAbsenceValue : rules.FullAbsenceValue);
                items.Add(new(PaymentItemKind.BonusAbsenceDeduction, $"Bonificacao: falta {absence.Date:yyyy-MM-dd}", deduction, null, absence.IsHalf ? 0.5m : 1m, null, absence.Id)); remaining -= deduction;
            }
        }
        var sources = new Dictionary<DateOnly, string>();
        if (person.EmploymentType == EmploymentType.Contractor && person.ContractualDsrAuthorized && rules.ContractorDsrValue.HasValue)
        {
            var priorDsr = await repository.GetDsrChargesAsync(person.Id, cancellationToken);
            var charged = priorDsr.Where(x => !x.IsCancelled).Select(x => x.WeekStart).ToHashSet();
            var consumedSources = priorDsr.Where(x => !x.IsCancelled).SelectMany(x => x.AbsenceIds.Split(',', StringSplitOptions.RemoveEmptyEntries)).ToHashSet();
            foreach (var group in PaymentWeek.Eligible(absences.Where(x => !consumedSources.Contains(x.Id.ToString())), from, end, rules.HalfAbsenceGeneratesDsr, charged))
            {
                sources[group.Key] = string.Join(",", group.Select(x => x.Id));
                items.Add(new(PaymentItemKind.Dsr, $"DSR: semana {group.Key:yyyy-MM-dd}", rules.ContractorDsrValue.Value, null, 1m, null, null, group.Key));
            }
        }
        var deductions = items.Where(x => x.Kind is PaymentItemKind.FullAbsence or PaymentItemKind.HalfAbsence or PaymentItemKind.BonusAbsenceDeduction or PaymentItemKind.Dsr or PaymentItemKind.NegativeHours or PaymentItemKind.Voucher or PaymentItemKind.Deduction).Sum(x => x.Amount);
        var preview = new PaymentPreviewDto(person.Id, person.Name, person.EmploymentType, request.CompetenceYear, request.CompetenceMonth, request.Fortnight, monthlyValue, result.FortnightPercent, first?.NetValue ?? 0m, result.GrossValue, result.AdditionValue, Money(deductions), Money(result.GrossValue + result.AdditionValue - deductions), items);
        if (employee)
        {
            preview = preview with { EmployeeSettlement = new EmployeeSettlementDto(request.AccountantAmount,
                voucherEntries.Sum(x => x.Amount), preview.NetValue, first?.EmployeeAccountantAmount,
                first?.NetValue ?? 0, first?.Status == PaymentCalculationStatus.Paid ? first.PaidAt : null,
                request.AccountantReference, request.AccountantNotes, false) };
        }
        return new(person, rules, first, vouchers, preview, sources);
    }
    private static decimal Money(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
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
    private static PaymentPersonDto MapPerson(PaymentPerson person) => new(person.Id, person.Name, person.EmploymentType, person.IsActive, person.MonthlyValue, person.MonthlyBonus, person.AdmissionDate, person.ContractualDsrAuthorized);
    private static string PaymentLogoPath() => Path.Combine(AppContext.BaseDirectory, "Assets", "logo-cjm.png");
    private static string ExportFileName(string prefix, int? year, int? month, Fortnight? fortnight)
    {
        var period = year.HasValue && month.HasValue ? $"{year}-{month:00}" : year.HasValue ? year.Value.ToString() : DateTime.UtcNow.ToString("yyyyMMdd");
        var fortnightSuffix = fortnight.HasValue ? $"-{(int)fortnight.Value}a-quinzena" : string.Empty;
        return $"{prefix}-{period}{fortnightSuffix}.pdf";
    }
    private static PaymentRulesDto MapRules(PaymentRuleConfiguration x) => new(x.Id, x.EffectiveFrom, x.EmployeeFirstFortnightPercent, x.ContractorFirstFortnightPercent, x.FullAbsenceValue, x.HalfAbsenceValue, x.MonthlyWorkMinutes, x.PositiveHourMultiplier, x.NegativeHourMultiplier, x.NightHourMultiplier, x.ContractorAbsenceDailyValue, x.ContractorDsrValue, x.HalfAbsenceGeneratesDsr);
    private static VoucherDto MapVoucher(Voucher x) => new(x.Id, x.PaymentPersonId, x.PaymentPerson?.Name ?? string.Empty, x.Description, x.TotalValue, x.InstallmentValue, x.RemainingBalance, x.StartYear, x.StartMonth, x.Periodicity, x.IntervalMonths, x.InstallmentCount, x.AppliedInstallments, x.Status);
    private static PaymentHistoryDto MapHistory(PaymentCalculation x) => new(x.Id, x.PaymentPersonId, x.PersonName, x.EmploymentType, x.CompetenceYear, x.CompetenceMonth, x.Fortnight, x.BaseValue, x.NetValue, x.FirstFortnightValue, x.SecondFortnightValue, x.MonthlyTotalValue, x.Status, x.CalculatedAt, x.PaidAt, x.Items.Select(i => new PaymentItemDto(i.Kind, i.Description, i.Amount, i.QuantityMinutes, i.Quantity, i.VoucherId, i.AbsenceId, i.DsrWeekStart)).ToList()) { EmployeeSettlement = EmployeeSettlementFromSnapshot(x) };
    private sealed record CalculationContext(PaymentPerson Person, PaymentRuleConfiguration Rules, PaymentCalculation? FirstCalculation, List<Voucher> Vouchers, PaymentPreviewDto Preview, Dictionary<DateOnly, string> DsrSources);
}
