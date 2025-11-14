using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.GetDailyLaunchHistory
{
    public class LaunchHistoryItem
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public LaunchType Type { get; set; }
        public string? CategoryName { get; set; }
        public string? CustomerName { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;

        public DateTime CreatedOn { get; set; }
        public DateTime ModifiedOn { get; set; }

        // Indica se foi criado, alterado ou ambos no dia
        public string ChangeType { get; set; } = string.Empty;
    }
}
