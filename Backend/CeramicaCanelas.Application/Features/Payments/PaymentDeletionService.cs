using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Features.Payments;

public sealed record DeletePaymentEntryRequest(string Reason, int? Revision = null, bool CorrectClosedPeriod = false);

public sealed partial class PaymentApplicationService
{
    private static void ValidateDeletion(DeletePaymentEntryRequest request, string actor)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 2000)
            throw new InvalidOperationException("Informe o motivo da exclusao, com ate 2000 caracteres.");
        if (string.IsNullOrWhiteSpace(actor))
            throw new InvalidOperationException("Usuario responsavel obrigatorio.");
    }

    public async Task DeletePersonAsync(Guid personId, DeletePaymentEntryRequest request, string actor, CancellationToken ct)
    {
        ValidateDeletion(request, actor);
        var person = await GetPerson(personId, ct);
        if (person.IsDeleted) throw new InvalidOperationException("Trabalhador ja excluido.");
        var before = new { person.Name, person.IsActive, person.IsDeleted };
        person.IsDeleted = true;
        person.IsActive = false;
        person.Revision++;
        person.ModifiedOn = DateTime.UtcNow;
        Audit(person.Id, person.Id, "PersonDeleted", before,
            new { person.Name, person.IsActive, person.IsDeleted }, request.Reason, actor);
        await repository.SaveChangesAsync(ct);
    }

    public async Task DeleteAbsenceAsync(Guid personId, Guid absenceId, DeletePaymentEntryRequest request, string actor, CancellationToken ct)
    {
        ValidateDeletion(request, actor);
        var absence = (await repository.GetAbsencesAsync(personId, new(2000, 1, 1), new(9999, 12, 31), ct))
            .SingleOrDefault(x => x.Id == absenceId) ?? throw new KeyNotFoundException("Falta nao encontrada.");
        if (request.Revision != absence.Revision) throw new InvalidOperationException("Informe a revisao atual da falta.");
        if (absence.IsCancelled) throw new InvalidOperationException("Falta ja excluida.");
        await SaveAbsenceAsync(personId, absenceId,
            new(absence.Date, absence.IsHalf, request.Reason, true, absence.Revision, request.CorrectClosedPeriod), actor, ct);
    }

    public async Task DeleteVoucherAsync(Guid voucherId, DeletePaymentEntryRequest request, string actor, CancellationToken ct)
    {
        ValidateDeletion(request, actor);
        var voucher = await repository.GetVoucherAsync(voucherId, ct) ?? throw new KeyNotFoundException("Vale nao encontrado.");
        if (voucher.Status == VoucherStatus.Cancelled) throw new InvalidOperationException("Vale ja excluido.");
        var person = await GetPerson(voucher.PaymentPersonId, ct);
        var before = new { voucher.Status, voucher.AppliedInstallments, voucher.RemainingBalance };
        voucher.Status = VoucherStatus.Cancelled;
        voucher.Revision++;
        voucher.ModifiedOn = DateTime.UtcNow;
        person.Revision++;
        Audit(person.Id, voucher.Id, "VoucherDeleted", before,
            new { voucher.Status, voucher.AppliedInstallments, voucher.RemainingBalance }, request.Reason, actor);
        await repository.SaveChangesAsync(ct);
    }

    public async Task DeletePreparationAsync(Guid preparationId, DeletePaymentEntryRequest request, string actor, CancellationToken ct)
    {
        ValidateDeletion(request, actor);
        var preparation = await repository.GetPreparationAsync(preparationId, ct) ?? throw new KeyNotFoundException("Preparacao nao encontrada.");
        if (request.Revision != preparation.Revision) throw new InvalidOperationException("Informe a revisao atual da preparacao.");
        if (await repository.GetCalculationAsync(preparation.PaymentPersonId, preparation.Year, preparation.Month, preparation.Fortnight, ct) != null)
            throw new InvalidOperationException("A preparacao possui fechamento. Cancele a apuracao nao paga primeiro.");
        var person = await GetPerson(preparation.PaymentPersonId, ct);
        person.Revision++;
        Audit(person.Id, preparation.Id, "PreparationDeleted", preparation, new { Deleted = true }, request.Reason, actor);
        repository.RemovePreparation(preparation);
        await repository.SaveChangesAsync(ct);
    }

    public async Task DeleteCalculationAsync(Guid calculationId, DeletePaymentEntryRequest request, string actor, CancellationToken ct)
    {
        ValidateDeletion(request, actor);
        var calculation = await repository.GetCalculationAsync(calculationId, ct) ?? throw new KeyNotFoundException("Apuracao nao encontrada.");
        if (calculation.Status == PaymentCalculationStatus.Paid || calculation.PaidAt.HasValue)
            throw new InvalidOperationException("Apuracao paga nao pode ser excluida. Registre um ajuste rastreavel.");
        if (calculation.Status == PaymentCalculationStatus.Cancelled)
            throw new InvalidOperationException("Apuracao ja excluida.");
        if ((await repository.GetAdjustmentsAsync(calculation.Id, ct)).Count != 0)
            throw new InvalidOperationException("Apuracao com ajustes nao pode ser excluida.");
        if (calculation.Fortnight == Fortnight.First && await repository.GetCalculationAsync(calculation.PaymentPersonId,
                calculation.CompetenceYear, calculation.CompetenceMonth, Fortnight.Second, ct) != null)
            throw new InvalidOperationException("Cancele a segunda quinzena antes da primeira.");

        EmployeeBonusSettlement? employeeBonus = null;
        if (calculation.EmploymentType == EmploymentType.Employee)
        {
            employeeBonus = await repository.GetEmployeeBonusForCalculationAsync(calculation.Id, ct);
        }
        var person = await GetPerson(calculation.PaymentPersonId, ct);
        person.Revision++;
        foreach (var item in calculation.Items.Where(x => x.Kind == PaymentItemKind.Voucher && x.VoucherId.HasValue))
        {
            var voucher = await repository.GetVoucherAsync(item.VoucherId!.Value, ct)
                ?? throw new InvalidOperationException("Vale de origem nao encontrado para reverter a parcela.");
            if (voucher.AppliedInstallments <= 0) throw new InvalidOperationException("Saldo de parcelas inconsistente. Confira o vale antes de cancelar.");
            voucher.AppliedInstallments--;
            if (voucher.RemainingBalance.HasValue) voucher.RemainingBalance += item.Amount;
            if (voucher.Status == VoucherStatus.PaidOff) voucher.Status = VoucherStatus.Active;
            voucher.Revision++;
            voucher.ModifiedOn = DateTime.UtcNow;
        }
        foreach (var charge in await repository.GetCalculationDsrChargesAsync(calculation.Id, ct))
        {
            charge.IsCancelled = true;
            charge.ModifiedOn = DateTime.UtcNow;
        }
        var preparation = await repository.GetPreparationAsync(person.Id, calculation.CompetenceYear, calculation.CompetenceMonth, calculation.Fortnight, ct);
        if (preparation != null)
        {
            preparation.Status = PaymentCalculationStatus.Draft;
            preparation.Revision++;
            preparation.ModifiedOn = DateTime.UtcNow;
        }
        var before = new { calculation.Status, calculation.NetValue };
        if (employeeBonus != null) { employeeBonus.IsCancelled = true; employeeBonus.Revision++; employeeBonus.ModifiedOn = DateTime.UtcNow; }
        calculation.Status = PaymentCalculationStatus.Cancelled;
        calculation.Revision++;
        calculation.ModifiedOn = DateTime.UtcNow;
        Audit(person.Id, calculation.Id, "CalculationDeleted", before,
            new { calculation.Status, calculation.NetValue }, request.Reason, actor);
        await repository.SaveChangesAsync(ct);
    }
}
