using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.GetTrialBalanceReportPdfQuery
{
    public class GetTrialBalanceReportPdfQuery : IRequest<byte[]>
    {
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? CategoryId { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
        public PaymentStatus? Status { get; set; }
        public string? Search { get; set; }
    }

    public record AppliedFilter(string Label, string Value);
}
