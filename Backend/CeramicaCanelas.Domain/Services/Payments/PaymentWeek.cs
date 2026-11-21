using CeramicaCanelas.Domain.Entities.Payments;
namespace CeramicaCanelas.Domain.Services.Payments;
public static class PaymentWeek
{
    // Monday through Sunday; charge belongs to the period containing Sunday.
    public static DateOnly Start(DateOnly date) => date.AddDays(-(((int)date.DayOfWeek + 6) % 7));
    public static IEnumerable<IGrouping<DateOnly, PaymentAbsence>> Eligible(IEnumerable<PaymentAbsence> absences, DateOnly from, DateOnly end, bool includeHalf, ISet<DateOnly> charged) =>
        absences.Where(x => !x.IsCancelled && (!x.IsHalf || includeHalf)).GroupBy(x => Start(x.Date))
            .Where(g => g.Key.AddDays(6) >= from && g.Key.AddDays(6) <= end && !charged.Contains(g.Key));
}
