using System.Text.Json;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
namespace CeramicaCanelas.Application.Features.Payments;
public sealed record PreparationRequest(CalculatePaymentRequest Calculation, bool InReview, int Revision = 0);
public sealed record AdjustmentRequest(string Reference, decimal Amount, string Reason);
public sealed record AdjustmentPaidRequest(string Reference, DateTime PaidAt);
public sealed partial class PaymentApplicationService
{
    public async Task<PaymentPreparation> SavePreparationAsync(PreparationRequest request, string actor, CancellationToken ct)
    {
        await Calculate(request.Calculation, ct);
        var r = request.Calculation;
        if (await repository.GetCalculationAsync(r.PaymentPersonId, r.CompetenceYear, r.CompetenceMonth, r.Fortnight, ct) != null) throw new InvalidOperationException("Periodo fechado.");
        var entity = await repository.GetPreparationAsync(r.PaymentPersonId, r.CompetenceYear, r.CompetenceMonth, r.Fortnight, ct);
        if (entity != null && entity.Revision != request.Revision) throw new InvalidOperationException("Preparacao alterada por outro usuario.");
        var person = await GetPerson(r.PaymentPersonId, ct); person.Revision++;
        var before = entity == null ? "null" : JsonSerializer.Serialize(entity);
        if (entity == null) { entity = new PaymentPreparation { PaymentPersonId = r.PaymentPersonId, Year = r.CompetenceYear, Month = r.CompetenceMonth, Fortnight = r.Fortnight }; repository.AddPreparation(entity); }
        entity.Status = request.InReview ? PaymentCalculationStatus.InReview : PaymentCalculationStatus.Draft;
        entity.RequestJson = JsonSerializer.Serialize(r); entity.Revision++; entity.ModifiedOn = DateTime.UtcNow;
        Audit(r.PaymentPersonId, entity.Id, "PreparationSaved", before, entity, "Preparacao", actor);
        await repository.SaveChangesAsync(ct); return entity;
    }
    public Task<PaymentPreparation?> GetPreparationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct)
    {
        ValidateCompetence(year, month); ValidateFortnight(fortnight); return repository.GetPreparationAsync(personId, year, month, fortnight, ct);
    }
    public async Task<PaymentAdjustment> CreateAdjustmentAsync(Guid calculationId, AdjustmentRequest request, string actor, CancellationToken ct)
    {
        var calculation = await repository.GetCalculationAsync(calculationId, ct) ?? throw new KeyNotFoundException("Fechamento nao encontrado.");
        if (calculation.Status is not (PaymentCalculationStatus.Calculated or PaymentCalculationStatus.Paid)) throw new InvalidOperationException("Ajuste exige fechamento.");
        if (string.IsNullOrWhiteSpace(request.Reference) || request.Reference.Length > 100 || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 2000 || request.Amount == 0m || decimal.Round(request.Amount, 2) != request.Amount) throw new InvalidOperationException("Informe referencia unica, motivo e valor com ate duas casas decimais.");
        if ((await repository.GetAdjustmentsAsync(calculationId, ct)).Any(x => x.Reference == request.Reference.Trim())) throw new InvalidOperationException("Referencia de ajuste ja utilizada.");
        var adjustment = new PaymentAdjustment { PaymentCalculationId = calculationId, Reference = request.Reference.Trim(), Amount = request.Amount, Reason = request.Reason.Trim(), UserId = actor };
        calculation.Revision++; repository.AddAdjustment(adjustment);
        Audit(calculation.PaymentPersonId, adjustment.Id, "AdjustmentCreated", new { calculation.NetValue }, adjustment, request.Reason, actor);
        await repository.SaveChangesAsync(ct); return adjustment;
    }
    public Task<List<PaymentAdjustment>> GetAdjustmentsAsync(Guid calculationId, CancellationToken ct) => repository.GetAdjustmentsAsync(calculationId, ct);
    public async Task PayAdjustmentAsync(Guid calculationId, AdjustmentPaidRequest request, string actor, CancellationToken ct)
    {
        var calculation = await repository.GetCalculationAsync(calculationId, ct) ?? throw new KeyNotFoundException("Fechamento nao encontrado.");
        var adjustment = (await repository.GetAdjustmentsAsync(calculationId, ct)).SingleOrDefault(x => x.Reference == request.Reference) ?? throw new KeyNotFoundException("Ajuste nao encontrado.");
        if (adjustment.PaidAt.HasValue || request.PaidAt == default) throw new InvalidOperationException("Ajuste ja liquidado ou data invalida.");
        adjustment.PaidAt = request.PaidAt.ToUniversalTime(); adjustment.Revision++;
        Audit(calculation.PaymentPersonId, adjustment.Id, "AdjustmentPaid", new { PaidAt = (DateTime?)null }, adjustment, adjustment.Reason, actor);
        await repository.SaveChangesAsync(ct);
    }
}
