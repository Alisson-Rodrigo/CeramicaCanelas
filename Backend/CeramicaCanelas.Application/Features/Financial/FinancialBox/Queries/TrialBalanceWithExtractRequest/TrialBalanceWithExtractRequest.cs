using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.TrialBalanceWithExtractRequest
{
    public class TrialBalanceWithExtractRequest : IRequest<TrialBalanceWithExtractResult>
    {
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? CategoryId { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
        public PaymentStatus? Status { get; set; }
        public string? Search { get; set; }
    }
}
