using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;

namespace CeramicaCanelas.Application.Contracts.Persistance.Repositories;

public interface IPaymentRepository
{
    Task<List<PaymentPerson>> GetPeopleAsync(CancellationToken cancellationToken);
    Task<PaymentPerson?> GetPersonAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> EmployeeExistsAsync(Guid employeeId, CancellationToken cancellationToken);
    Task AddPersonAsync(PaymentPerson person, CancellationToken cancellationToken);
    Task<List<PaymentRuleConfiguration>> GetRulesAsync(CancellationToken cancellationToken);
    Task AddRulesAsync(PaymentRuleConfiguration rules, CancellationToken cancellationToken);
    Task<List<Voucher>> GetVouchersAsync(Guid? personId, CancellationToken cancellationToken);
    Task<Voucher?> GetVoucherAsync(Guid id, CancellationToken cancellationToken);
    Task AddVoucherAsync(Voucher voucher, CancellationToken cancellationToken);
    Task<PaymentCalculation?> GetCalculationAsync(Guid id, CancellationToken cancellationToken);
    Task<PaymentCalculation?> GetCalculationAsync(Guid personId, int year, int month, Fortnight fortnight, CancellationToken cancellationToken);
    Task<List<PaymentCalculation>> GetHistoryAsync(Guid? personId, int? year, int? month, CancellationToken cancellationToken);
    Task AddCalculationAsync(PaymentCalculation calculation, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
