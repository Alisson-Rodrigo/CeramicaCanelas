using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Queries.Pages
{
    public class SaleItemResult
    {
        public Guid Id { get; set; }
        public string Product { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
        public decimal Subtotal { get; set; }
        public int Break {  get; set; }
    }

}
