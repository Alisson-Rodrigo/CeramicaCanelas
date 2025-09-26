using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.GetExtractsReportQuery
{
    public class ExtractReportResult
    {
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public decimal TotalGeneral { get; set; }
        public Dictionary<PaymentMethod, decimal> TotalsByAccount { get; set; } = new();
    }
}
