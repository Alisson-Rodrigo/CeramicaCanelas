using CeramicaCanelas.Domain.Abstract;
using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Domain.Entities.Sales
{
    public class SalePayment : BaseEntity
    {
        public Guid SaleId { get; set; }
        public Sale Sale { get; set; } = null!;

        public DateOnly? PaymentDate { get; set; }
        public decimal? Amount { get; set; }
        public PaymentMethod? PaymentMethod { get; set; }
    }
}
