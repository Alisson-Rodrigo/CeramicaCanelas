using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using Microsoft.EntityFrameworkCore;

namespace CeramicaCanelas.Persistence.Repositories;

public sealed class PaymentRepository(DefaultContext context) : IPaymentRepository
{
    public Task<List<PaymentPerson>> GetPeopleAsync(CancellationToken ct) => context.PaymentPeople.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
    public Task<PaymentPerson?> GetPersonAsync(Guid id, CancellationToken ct) => context.PaymentPeople.FirstOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> EmployeeExistsAsync(Guid id, CancellationToken ct) => context.Employees.AnyAsync(x => x.Id == id, ct);
    public async Task AddPersonAsync(PaymentPerson x, CancellationToken ct) { await context.PaymentPeople.AddAsync(x, ct); await context.SaveChangesAsync(ct); }
    public Task<List<PaymentRuleConfiguration>> GetRulesAsync(CancellationToken ct) => context.PaymentRuleConfigurations.AsNoTracking().OrderByDescending(x => x.EffectiveFrom).ToListAsync(ct);
    public async Task AddRulesAsync(PaymentRuleConfiguration x, CancellationToken ct) { await context.PaymentRuleConfigurations.AddAsync(x, ct); await context.SaveChangesAsync(ct); }
    public Task<List<Voucher>> GetVouchersAsync(Guid? personId, CancellationToken ct) { var query = context.PaymentVouchers.Include(x => x.PaymentPerson).Include(x => x.Competences).AsQueryable(); if (personId.HasValue) query = query.Where(x => x.PaymentPersonId == personId); return query.OrderByDescending(x => x.Date).ToListAsync(ct); }
    public Task<Voucher?> GetVoucherAsync(Guid id, CancellationToken ct) => context.PaymentVouchers.Include(x => x.PaymentPerson).Include(x => x.Competences).FirstOrDefaultAsync(x => x.Id == id, ct);
    public async Task AddVoucherAsync(Voucher x, CancellationToken ct) { await context.PaymentVouchers.AddAsync(x, ct); await context.SaveChangesAsync(ct); }
    public Task<PaymentCalculation?> GetCalculationAsync(Guid id, CancellationToken ct) => context.PaymentCalculations.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct);
    public Task<PaymentCalculation?> GetCalculationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct) => context.PaymentCalculations.Include(x => x.Items).FirstOrDefaultAsync(x => x.PaymentPersonId == personId && x.CompetenceYear == year && x.CompetenceMonth == month && x.Fortnight == fortnight, ct);
    public Task<List<PaymentCalculation>> GetHistoryAsync(Guid? personId, int? year, int? month, CancellationToken ct) { var query = context.PaymentCalculations.Include(x => x.Items).AsNoTracking().AsQueryable(); if (personId.HasValue) query = query.Where(x => x.PaymentPersonId == personId); if (year.HasValue) query = query.Where(x => x.CompetenceYear == year); if (month.HasValue) query = query.Where(x => x.CompetenceMonth == month); return query.OrderByDescending(x => x.CompetenceYear).ThenByDescending(x => x.CompetenceMonth).ThenByDescending(x => x.Fortnight).ToListAsync(ct); }
    public async Task AddCalculationAsync(PaymentCalculation x, CancellationToken ct) { await context.PaymentCalculations.AddAsync(x, ct); await context.SaveChangesAsync(ct); }
    public Task SaveChangesAsync(CancellationToken ct) => context.SaveChangesAsync(ct);
}
