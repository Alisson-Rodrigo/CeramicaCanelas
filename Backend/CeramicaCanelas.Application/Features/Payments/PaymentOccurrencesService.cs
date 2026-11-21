using System.Text.Json;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using CeramicaCanelas.Domain.Services.Payments;
namespace CeramicaCanelas.Application.Features.Payments;
public sealed record AbsenceRequest(DateOnly Date, bool IsHalf, string Observation, bool IsCancelled = false, int Revision = 0, bool CorrectClosedPeriod = false);
public sealed record AbsenceDto(Guid Id, Guid PaymentPersonId, EmploymentType EmploymentType, DateOnly Date, bool IsHalf, bool IsCancelled, string Observation, string RecordedBy, int Revision, int Year, int Month, Fortnight Fortnight)
{
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public EmployeeAbsenceReviewDto? EmployeeReview { get; init; }
}
public sealed record AccountantSummaryDto(AccountantEmployeeDto Person, int Year, int Month, int FullAbsences,
    int HalfAbsences, IReadOnlyCollection<AccountantAbsenceOccurrenceDto> Occurrences)
{
    public AccountantHoursDto Hours { get; init; } = new(0, 0, 0);
}
public sealed partial class PaymentApplicationService
{
    private void Audit(Guid person, Guid? subject, string action, object before, object after, string reason, string actor) => repository.AddAudit(new PaymentAudit { PaymentPersonId = person, SubjectId = subject, Action = action, Before = JsonSerializer.Serialize(before), After = JsonSerializer.Serialize(after), Reason = reason, UserId = actor });
    public async Task<IReadOnlyCollection<AbsenceDto>> GetAbsencesAsync(Guid personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month); await GetPerson(personId, ct);
        return (await repository.GetAbsencesAsync(personId, new(year, month, 1), new(year, month, DateTime.DaysInMonth(year, month)), ct)).Select(MapAbsence).ToList();
    }
    public async Task<AbsenceDto> SaveAbsenceAsync(Guid personId, Guid? id, AbsenceRequest request, string actor, CancellationToken ct)
    {
        ValidateCompetence(request.Date.Year, request.Date.Month);
        if (string.IsNullOrWhiteSpace(actor)) throw new InvalidOperationException("Usuario obrigatorio.");
        if (request.Observation?.Length > 2000) throw new InvalidOperationException("Observacao excede 2000 caracteres.");
        var person = await GetPerson(personId, ct);
        if (person.IsDeleted && !id.HasValue) throw new InvalidOperationException("Trabalhador excluido.");
        var all = await repository.GetAbsencesAsync(personId, new(2000, 1, 1), new(9999, 12, 31), ct);
        var existing = id.HasValue ? all.SingleOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException("Falta nao encontrada.") : null;
        if (existing != null && existing.Revision != request.Revision) throw new InvalidOperationException("Ocorrencia alterada por outro usuario.");
        if (all.Any(x => x.Date == request.Date && x.Id != id)) throw new InvalidOperationException("Ja existe ocorrencia nesta data; corrija o registro existente.");
        var history = await repository.GetHistoryAsync(personId, null, null, null, ct);
        foreach (var date in existing == null ? new[] { request.Date } : new[] { request.Date, existing.Date })
        {
            if (history.Any(x => x.Status is PaymentCalculationStatus.Calculated or PaymentCalculationStatus.Paid &&
                ((x.CompetenceYear == date.Year && x.CompetenceMonth == date.Month && (x.Fortnight == Fortnight.Second || date.Day <= 15)) ||
                 (x.CompetenceYear == PaymentWeek.Start(date).AddDays(6).Year && x.CompetenceMonth == PaymentWeek.Start(date).AddDays(6).Month && x.Fortnight == (PaymentWeek.Start(date).AddDays(6).Day <= 15 ? Fortnight.First : Fortnight.Second)))))
                if (!request.CorrectClosedPeriod || existing == null || string.IsNullOrWhiteSpace(request.Observation))
                    throw new InvalidOperationException("Periodo fechado. Para corrigir uma ocorrencia existente, confirme CorrectClosedPeriod e informe o motivo. Os fechamentos permanecem intactos; diferencas financeiras exigem ajuste separado.");
        }
        person.Revision++;
        var before = existing == null ? "null" : JsonSerializer.Serialize(existing);
        var entity = existing ?? new PaymentAbsence { PaymentPersonId = personId, EmploymentType = person.EmploymentType, RecordedBy = actor };
        if (person.EmploymentType == EmploymentType.Employee)
        {
            entity.IsReviewed = false; entity.ReviewedAt = null; entity.ReviewedBy = null;
        }
        entity.Date = request.Date; entity.IsHalf = request.IsHalf; entity.IsCancelled = request.IsCancelled; entity.Observation = request.Observation ?? string.Empty; entity.Revision++; entity.ModifiedOn = DateTime.UtcNow;
        repository.AddAudit(new PaymentAudit { PaymentPersonId = personId, SubjectId = entity.Id, Action = existing == null ? "AbsenceCreated" : "AbsenceUpdated", Before = before, After = JsonSerializer.Serialize(entity), Reason = entity.Observation, UserId = actor });
        if (existing == null) await repository.AddAbsenceAsync(entity, ct); else await repository.SaveChangesAsync(ct);
        return MapAbsence(entity);
    }
    public Task<List<PaymentAudit>> GetAuditAsync(Guid personId, CancellationToken ct) => repository.GetAuditsAsync(personId, ct);
    public Task<List<PaymentDsrCharge>> GetDsrAsync(Guid personId, CancellationToken ct) => repository.GetDsrChargesAsync(personId, ct);
    public async Task<AccountantSummaryDto> GetAccountantSummaryAsync(Guid personId, int year, int month, CancellationToken ct)
    {
        var person = await GetPerson(personId, ct);
        if (person.EmploymentType != EmploymentType.Employee) throw new InvalidOperationException("Relatorio destinado a funcionarios.");
        var absences = await GetAbsencesAsync(personId, year, month, ct); var active = absences.Where(x => !x.IsCancelled).ToList();
        var hours = await GetEmployeeHoursSummaryAsync(personId, year, month, ct);
        return new AccountantSummaryDto(new(person.Id, person.Name), year, month,
            active.Count(x => !x.IsHalf), active.Count(x => x.IsHalf), active.Select(x => new AccountantAbsenceOccurrenceDto(x.Date, x.IsHalf)).ToList())
        {
            Hours = new(hours.PositiveMinutes, hours.NegativeMinutes, hours.BalanceMinutes)
        };
    }
    public async Task<MonthlyPaymentSummaryDto> GetMonthlySummaryAsync(Guid personId, int year, int month, CancellationToken ct)
    {
        ValidateCompetence(year, month); await GetPerson(personId, ct);
        var history = await GetHistoryAsync(personId, year, month, null, ct);
        var adjustments = new List<PaymentAdjustment>();
        foreach (var calculation in history) adjustments.AddRange(await repository.GetAdjustmentsAsync(calculation.Id, ct));
        return new(personId, year, month, history, adjustments, history.Where(x => x.Status != PaymentCalculationStatus.Cancelled).Sum(x => x.NetValue), adjustments.Sum(x => x.Amount), history.Any(x => x.Fortnight == Fortnight.Second && x.Status is PaymentCalculationStatus.Calculated or PaymentCalculationStatus.Paid));
    }
    private static AbsenceDto MapAbsence(PaymentAbsence x) => new(x.Id, x.PaymentPersonId, x.EmploymentType, x.Date, x.IsHalf, x.IsCancelled, x.Observation, x.RecordedBy, x.Revision, x.Date.Year, x.Date.Month, x.Date.Day <= 15 ? Fortnight.First : Fortnight.Second) { EmployeeReview = x.EmploymentType == EmploymentType.Employee ? new(x.IsReviewed, x.ReviewedAt, x.ReviewedBy) : null };
}


public sealed record MonthlyPaymentSummaryDto(Guid PaymentPersonId, int Year, int Month, IReadOnlyCollection<PaymentHistoryDto> Periods, IReadOnlyCollection<PaymentAdjustment> Adjustments, decimal OriginalNetTotal, decimal AdjustmentTotal, bool IsClosed);
