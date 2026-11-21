using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories;

public interface IPaymentRepository
{
    Task<List<PaymentPerson>> GetPeopleAsync(CancellationToken cancellationToken);
    Task<PaymentPerson?> GetPersonAsync(Guid id, CancellationToken cancellationToken);
    Task AddPersonAsync(PaymentPerson person, CancellationToken cancellationToken);
    Task<List<PaymentRuleConfiguration>> GetRulesAsync(CancellationToken cancellationToken);
    Task AddRulesAsync(PaymentRuleConfiguration rules, CancellationToken cancellationToken);
    Task<List<Voucher>> GetVouchersAsync(Guid? personId, CancellationToken cancellationToken);
    Task<Voucher?> GetVoucherAsync(Guid id, CancellationToken cancellationToken);
    Task AddVoucherAsync(Voucher voucher, CancellationToken cancellationToken);
    Task<PaymentCalculation?> GetCalculationAsync(Guid id, CancellationToken cancellationToken);
    Task<PaymentCalculation?> GetCalculationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken cancellationToken);
    Task<List<PaymentCalculation>> GetHistoryAsync(Guid? personId, int? year, int? month, Fortnight? fortnight, CancellationToken cancellationToken);
    Task AddCalculationAsync(PaymentCalculation calculation, CancellationToken cancellationToken);
    Task<List<PaymentAbsence>> GetAbsencesAsync(Guid personId, DateOnly from, DateOnly to, CancellationToken ct);
    Task AddAbsenceAsync(PaymentAbsence absence, CancellationToken ct);
    void AddAudit(PaymentAudit audit);
    Task<List<PaymentAudit>> GetAuditsAsync(Guid personId, CancellationToken ct);
    Task<List<PaymentDsrCharge>> GetDsrChargesAsync(Guid personId, CancellationToken ct);
    void AddDsrCharge(PaymentDsrCharge charge);
    Task<PaymentPreparation?> GetPreparationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken ct);
    void AddPreparation(PaymentPreparation preparation);
    Task<List<PaymentAdjustment>> GetAdjustmentsAsync(Guid calculationId, CancellationToken ct);
    void AddAdjustment(PaymentAdjustment adjustment);
    Task<PaymentPreparation?> GetPreparationAsync(Guid id, CancellationToken ct);
    void RemovePreparation(PaymentPreparation preparation);
    Task<List<PaymentDsrCharge>> GetCalculationDsrChargesAsync(Guid calculationId, CancellationToken ct);
    Task<List<EmployeeAccountantSubmission>> GetEmployeeAccountantSubmissionsAsync(Guid personId, int year, int month, CancellationToken ct);
    void AddEmployeeAccountantSubmission(EmployeeAccountantSubmission submission);
    Task<List<EmployeeTimeEntry>> GetEmployeeTimeEntriesAsync(Guid personId, int year, int month, CancellationToken ct);
    Task<EmployeeTimeEntry?> GetEmployeeTimeEntryAsync(Guid id, CancellationToken ct);
    void AddEmployeeTimeEntry(EmployeeTimeEntry entry);
    Task<List<EmployeeBonusSettlement>> GetEmployeeBonusesAsync(Guid? personId, int year, int month, CancellationToken ct);
    Task<EmployeeBonusSettlement?> GetEmployeeBonusAsync(Guid id, CancellationToken ct);
    Task<EmployeeBonusSettlement?> GetEmployeeBonusForCalculationAsync(Guid calculationId, CancellationToken ct);
    void AddEmployeeBonus(EmployeeBonusSettlement bonus);
    Task<List<EmployeeBonusSettlement>> GetEmployeeBonusHistoryAsync(Guid personId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
