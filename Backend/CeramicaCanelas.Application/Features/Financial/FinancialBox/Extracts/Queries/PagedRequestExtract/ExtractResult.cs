using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Queries.PagedRequestExtract
{
    public class ExtractResult
    {
        public Guid Id { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public DateOnly Date { get; set; }
        public decimal Value { get; set; }
        public string? Observations { get; set; }
        public string OperatorName { get; set; }

        public ExtractResult(Extract extract)
        {
            Id = extract.Id;
            PaymentMethod = extract.PaymentMethod;
            Date = extract.Date;
            Value = extract.Value;
            Observations = extract.Observations;
            OperatorName = extract.OperatorName;
        }
    }
}
