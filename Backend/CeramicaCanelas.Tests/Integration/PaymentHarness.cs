using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Payments;
using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Domain.Enums.Payments;
using Moq;
namespace CeramicaCanelas.Tests.Integration;
internal sealed class PaymentHarness
{
    public PaymentPerson Person { get; } = new() { Name = "Teste", EmploymentType = EmploymentType.Contractor, MonthlyValue = 3000, MonthlyBonus = 400, ContractualDsrAuthorized = true };
    public List<EmployeeTimeEntry> TimeEntries { get; } = [];
    public List<EmployeeBonusSettlement> Bonuses { get; } = [];
    public List<EmployeeAccountantSubmission> Submissions { get; } = [];
    public List<Voucher> Vouchers { get; } = [];
    public List<PaymentAbsence> Absences { get; } = [];
    public List<PaymentCalculation> Calculations { get; } = [];
    public List<PaymentAudit> Audits { get; } = [];
    public List<PaymentDsrCharge> Dsr { get; } = [];
    public List<PaymentAdjustment> Adjustments { get; } = [];
    public List<PaymentPreparation> Preparations { get; } = [];
    public PaymentRuleConfiguration Rules { get; } = new() { EffectiveFrom = new(2000, 1, 1), EmployeeFirstFortnightPercent = 40, ContractorFirstFortnightPercent = 50, FullAbsenceValue = 100, HalfAbsenceValue = 50 };
    public Mock<IPaymentRepository> Repository { get; } = new();
    public PaymentApplicationService Service { get; }
    public PaymentHarness()
    {
        var r = Repository;
        r.Setup(x => x.GetPeopleAsync(It.IsAny<CancellationToken>())).ReturnsAsync(() => Person.IsDeleted ? new List<PaymentPerson>() : new() { Person });
        r.Setup(x => x.GetPersonAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => id == Person.Id ? Person : null);
        r.Setup(x => x.GetRulesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(() => new() { Rules });
        r.Setup(x => x.GetAbsencesAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, DateOnly from, DateOnly end, CancellationToken _) => Absences.Where(x => x.PaymentPersonId == id && x.Date >= from && x.Date <= end).ToList());
        r.Setup(x => x.AddAbsenceAsync(It.IsAny<PaymentAbsence>(), It.IsAny<CancellationToken>())).Callback((PaymentAbsence x, CancellationToken _) => Absences.Add(x)).Returns(Task.CompletedTask);
        r.Setup(x => x.AddAudit(It.IsAny<PaymentAudit>())).Callback((PaymentAudit x) => Audits.Add(x));
        r.Setup(x => x.GetAuditsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(() => Audits);
        r.Setup(x => x.GetDsrChargesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(() => Dsr);
        r.Setup(x => x.AddDsrCharge(It.IsAny<PaymentDsrCharge>())).Callback((PaymentDsrCharge x) => Dsr.Add(x));
        r.Setup(x => x.GetVouchersAsync(It.IsAny<Guid?>(), It.IsAny<CancellationToken>())).ReturnsAsync(() => Vouchers);
        r.Setup(x => x.GetCalculationAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Calculations.SingleOrDefault(x => x.Id == id));
        r.Setup(x => x.GetCalculationAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<Fortnight>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, int year, int month, Fortnight f, CancellationToken _) => Calculations.SingleOrDefault(x => x.PaymentPersonId == id && x.CompetenceYear == year && x.CompetenceMonth == month && x.Fortnight == f && x.Status != PaymentCalculationStatus.Cancelled));
        r.Setup(x => x.GetHistoryAsync(It.IsAny<Guid?>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<Fortnight?>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid? id, int? year, int? month, Fortnight? f, CancellationToken _) => Calculations.Where(x => (id == null || x.PaymentPersonId == id) && (year == null || x.CompetenceYear == year) && (month == null || x.CompetenceMonth == month) && (f == null || x.Fortnight == f)).ToList());
        r.Setup(x => x.AddCalculationAsync(It.IsAny<PaymentCalculation>(), It.IsAny<CancellationToken>())).Callback((PaymentCalculation x, CancellationToken _) => Calculations.Add(x)).Returns(Task.CompletedTask);
        r.Setup(x => x.SaveChangesAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        r.Setup(x => x.GetPreparationAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<Fortnight>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, int year, int month, Fortnight f, CancellationToken _) => Preparations.SingleOrDefault(x => x.PaymentPersonId == id && x.Year == year && x.Month == month && x.Fortnight == f && x.Status != PaymentCalculationStatus.Cancelled));
        r.Setup(x => x.AddPreparation(It.IsAny<PaymentPreparation>())).Callback((PaymentPreparation x) => Preparations.Add(x));
        r.Setup(x => x.GetAdjustmentsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Adjustments.Where(x => x.PaymentCalculationId == id).ToList());
        r.Setup(x => x.AddAdjustment(It.IsAny<PaymentAdjustment>())).Callback((PaymentAdjustment x) => Adjustments.Add(x));
        r.Setup(x => x.GetVoucherAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Vouchers.SingleOrDefault(x => x.Id == id));
        r.Setup(x => x.GetPreparationAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Preparations.SingleOrDefault(x => x.Id == id));
        r.Setup(x => x.RemovePreparation(It.IsAny<PaymentPreparation>())).Callback((PaymentPreparation x) => Preparations.Remove(x));
        r.Setup(x => x.GetCalculationDsrChargesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Dsr.Where(x => x.PaymentCalculationId == id).ToList());
        r.Setup(x => x.AddVoucherAsync(It.IsAny<Voucher>(), It.IsAny<CancellationToken>())).Callback((Voucher v, CancellationToken _) => Vouchers.Add(v)).Returns(Task.CompletedTask);
        r.Setup(x => x.AddEmployeeAccountantSubmission(It.IsAny<EmployeeAccountantSubmission>())).Callback((EmployeeAccountantSubmission x) => Submissions.Add(x));
        r.Setup(x => x.GetEmployeeAccountantSubmissionsAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, int year, int month, CancellationToken _) => Submissions.Where(x => x.PaymentPersonId == id && x.Year == year && x.Month == month).ToList());
        r.Setup(x => x.GetEmployeeTimeEntriesAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, int year, int month, CancellationToken _) => TimeEntries.Where(x => x.PaymentPersonId == id && x.Date.Year == year && x.Date.Month == month).ToList());
        r.Setup(x => x.GetEmployeeTimeEntryAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => TimeEntries.SingleOrDefault(x => x.Id == id));
        r.Setup(x => x.AddEmployeeTimeEntry(It.IsAny<EmployeeTimeEntry>())).Callback((EmployeeTimeEntry x) => TimeEntries.Add(x));
        r.Setup(x => x.GetEmployeeBonusesAsync(It.IsAny<Guid?>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid? id, int year, int month, CancellationToken _) => Bonuses.Where(x => (!id.HasValue || x.PaymentPersonId == id) && x.Year == year && x.Month == month).ToList());
        r.Setup(x => x.GetEmployeeBonusAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Bonuses.SingleOrDefault(x => x.Id == id));
        r.Setup(x => x.GetEmployeeBonusForCalculationAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Bonuses.SingleOrDefault(x => x.PaymentCalculationId == id));
        r.Setup(x => x.AddEmployeeBonus(It.IsAny<EmployeeBonusSettlement>())).Callback((EmployeeBonusSettlement x) => Bonuses.Add(x));
        r.Setup(x => x.GetEmployeeBonusHistoryAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((Guid id, CancellationToken _) => Bonuses.Where(x => x.PaymentPersonId == id).ToList());
        Service = new(r.Object, Mock.Of<IPdfReportService>());
    }
    public CalculatePaymentRequest Request(Fortnight fortnight = Fortnight.First, int month = 11, int year = 2026, decimal? accountant = null) => new(Person.Id, year, month, fortnight, 0, 0, 0, 0, 0, 0, null, null, null, accountant);
    public Task<AbsenceDto> Absence(int day, bool half = false, int month = 11) => Service.SaveAbsenceAsync(Person.Id, null, new(new(2026, month, day), half, "Teste"), "user-1", default);
}
