using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.Persistence.Repositories;

public sealed class PaymentRepository(DefaultContext context) : IPaymentRepository
{
    public Task<List<PaymentPerson>> GetPeopleAsync(CancellationToken ct) => context.PaymentPeople.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Name).ToListAsync(ct);
    public Task<PaymentPerson?> GetPersonAsync(Guid id, CancellationToken ct) => context.PaymentPeople.FirstOrDefaultAsync(x => x.Id == id, ct);
    public async Task AddPersonAsync(PaymentPerson x, CancellationToken ct) { await context.PaymentPeople.AddAsync(x, ct); await Persist(ct); }
    public Task<List<PaymentRuleConfiguration>> GetRulesAsync(CancellationToken ct) => context.PaymentRuleConfigurations.AsNoTracking().OrderByDescending(x => x.EffectiveFrom).ToListAsync(ct);
    public async Task AddRulesAsync(PaymentRuleConfiguration x, CancellationToken ct) { await context.PaymentRuleConfigurations.AddAsync(x, ct); await Persist(ct); }
    public Task<List<Voucher>> GetVouchersAsync(Guid? personId, CancellationToken ct) { var query = context.PaymentVouchers.Include(x => x.PaymentPerson).Include(x => x.Competences).AsQueryable(); if (personId.HasValue) query = query.Where(x => x.PaymentPersonId == personId); return query.OrderByDescending(x => x.Date).ToListAsync(ct); }
    public Task<Voucher?> GetVoucherAsync(Guid id, CancellationToken ct) => context.PaymentVouchers.Include(x => x.PaymentPerson).Include(x => x.Competences).FirstOrDefaultAsync(x => x.Id == id, ct);
    public async Task AddVoucherAsync(Voucher x, CancellationToken ct) { await context.PaymentVouchers.AddAsync(x, ct); await Persist(ct); }
    public Task<PaymentCalculation?> GetCalculationAsync(Guid id, CancellationToken ct) => context.PaymentCalculations.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct);
    public Task<PaymentCalculation?> GetCalculationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct) => context.PaymentCalculations.Include(x => x.Items).FirstOrDefaultAsync(x => x.PaymentPersonId == personId && x.CompetenceYear == year && x.CompetenceMonth == month && x.Fortnight == fortnight && x.Status != PaymentCalculationStatus.Cancelled, ct);
    public Task<List<PaymentCalculation>> GetHistoryAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken ct) { var query = context.PaymentCalculations.Include(x => x.Items).AsNoTracking().AsQueryable(); if (personId.HasValue) query = query.Where(x => x.PaymentPersonId == personId); if (year.HasValue) query = query.Where(x => x.CompetenceYear == year); if (month.HasValue) query = query.Where(x => x.CompetenceMonth == month); if (fortnight.HasValue) query = query.Where(x => x.Fortnight == fortnight); return query.OrderByDescending(x => x.CompetenceYear).ThenByDescending(x => x.CompetenceMonth).ThenByDescending(x => x.Fortnight).ThenBy(x => x.PersonName).ToListAsync(ct); }
    public async Task AddCalculationAsync(PaymentCalculation x, CancellationToken ct) { await context.PaymentCalculations.AddAsync(x, ct); await Persist(ct); }
    public Task<List<PaymentAbsence>> GetAbsencesAsync(Guid personId, DateOnly from, DateOnly to, CancellationToken ct) => context.Set<PaymentAbsence>().Where(x => x.PaymentPersonId == personId && x.Date >= from && x.Date <= to).OrderBy(x => x.Date).ToListAsync(ct);
    public async Task AddAbsenceAsync(PaymentAbsence absence, CancellationToken ct) { context.Add(absence); await Persist(ct); }
    public void AddAudit(PaymentAudit audit) => context.Add(audit);
    public Task<List<PaymentAudit>> GetAuditsAsync(Guid personId, CancellationToken ct) => context.Set<PaymentAudit>().AsNoTracking().Where(x => x.PaymentPersonId == personId).OrderBy(x => x.CreatedOn).ToListAsync(ct);
    public Task<List<PaymentDsrCharge>> GetDsrChargesAsync(Guid personId, CancellationToken ct) => context.Set<PaymentDsrCharge>().AsNoTracking().Where(x => x.PaymentPersonId == personId).ToListAsync(ct);
    public void AddDsrCharge(PaymentDsrCharge charge) => context.Add(charge);
    public Task<PaymentPreparation?> GetPreparationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct) => context.Set<PaymentPreparation>().SingleOrDefaultAsync(x => x.PaymentPersonId == personId && x.Year == year && x.Month == month && x.Fortnight == fortnight && x.Status != PaymentCalculationStatus.Cancelled, ct);
    public void AddPreparation(PaymentPreparation preparation) => context.Add(preparation);
    public Task<List<PaymentAdjustment>> GetAdjustmentsAsync(Guid calculationId, CancellationToken ct) => context.Set<PaymentAdjustment>().Where(x => x.PaymentCalculationId == calculationId).OrderBy(x => x.CreatedOn).ToListAsync(ct);
    public void AddAdjustment(PaymentAdjustment adjustment) => context.Add(adjustment);
    public Task<PaymentPreparation?> GetPreparationAsync(Guid id, CancellationToken ct) => context.Set<PaymentPreparation>().SingleOrDefaultAsync(x => x.Id == id, ct);
    public void RemovePreparation(PaymentPreparation preparation) => context.Remove(preparation);
    public Task<List<PaymentDsrCharge>> GetCalculationDsrChargesAsync(Guid calculationId, CancellationToken ct) => context.Set<PaymentDsrCharge>().Where(x => x.PaymentCalculationId == calculationId).ToListAsync(ct);
    public Task<List<EmployeeAccountantSubmission>> GetEmployeeAccountantSubmissionsAsync(Guid personId, int year, int month, CancellationToken ct) => context.Set<EmployeeAccountantSubmission>().AsNoTracking().Where(x => x.PaymentPersonId == personId && x.Year == year && x.Month == month).OrderBy(x => x.CreatedOn).ToListAsync(ct);
    public void AddEmployeeAccountantSubmission(EmployeeAccountantSubmission submission) => context.Add(submission);
    public Task<List<EmployeeTimeEntry>> GetEmployeeTimeEntriesAsync(Guid personId, int year, int month, CancellationToken ct) => context.Set<EmployeeTimeEntry>().Where(x => x.PaymentPersonId == personId && x.Date >= new DateOnly(year, month, 1) && x.Date <= new DateOnly(year, month, DateTime.DaysInMonth(year, month))).OrderBy(x => x.Date).ToListAsync(ct);
    public Task<EmployeeTimeEntry?> GetEmployeeTimeEntryAsync(Guid id, CancellationToken ct) => context.Set<EmployeeTimeEntry>().SingleOrDefaultAsync(x => x.Id == id, ct);
    public void AddEmployeeTimeEntry(EmployeeTimeEntry entry) => context.Add(entry);
    public Task<List<EmployeeBonusSettlement>> GetEmployeeBonusesAsync(Guid? personId, int year, int month, CancellationToken ct) => context.Set<EmployeeBonusSettlement>().Where(x => (!personId.HasValue || x.PaymentPersonId == personId) && x.Year == year && x.Month == month).ToListAsync(ct);
    public Task<EmployeeBonusSettlement?> GetEmployeeBonusAsync(Guid id, CancellationToken ct) => context.Set<EmployeeBonusSettlement>().SingleOrDefaultAsync(x => x.Id == id, ct);
    public Task<EmployeeBonusSettlement?> GetEmployeeBonusForCalculationAsync(Guid calculationId, CancellationToken ct) => context.Set<EmployeeBonusSettlement>().SingleOrDefaultAsync(x => x.PaymentCalculationId == calculationId, ct);
    public void AddEmployeeBonus(EmployeeBonusSettlement bonus) => context.Add(bonus);
    public Task<List<EmployeeBonusSettlement>> GetEmployeeBonusHistoryAsync(Guid personId, CancellationToken ct) => context.Set<EmployeeBonusSettlement>().Where(x => x.PaymentPersonId == personId).ToListAsync(ct);
    public Task SaveChangesAsync(CancellationToken ct) => Persist(ct);
    private async Task Persist(CancellationToken ct)
    {
        try { await context.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new InvalidOperationException("Registro alterado simultaneamente. Atualize os dados e tente novamente."); }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505") { throw new InvalidOperationException("Registro duplicado: periodo, semana, data ou referencia ja utilizada."); }
    }
}
