using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.CreatedSalesCommand
{
    public class CreatedSalesCommand : IRequest<Guid>
    {
        // Cabeçalho
        public int NoteNumber { get; set; }
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerAddress { get; set; }
        public string? CustomerPhone { get; set; }

        public DateOnly Date { get; set; }

        // Status inicial
        public SaleStatus SaleStatus { get; set; } = SaleStatus.Pending;

        // Desconto (R$)
        public decimal Discount { get; set; } = 0m;

        // Itens
        public List<CreatedSalesItem> Items { get; set; } = new();

        // Pagamentos (pode estar vazio se a venda for só registrada e não houver pagamento inicial)
        public List<CreatedSalesPayment> Payments { get; set; } = new();

        /// <summary>
        /// Mapeia o comando para a entidade de domínio Sale.
        /// </summary>
        public Sale AssignToSale()
        {
            var sale = new Sale
            {
                NoteNumber = NoteNumber,
                Date = Date,
                City = City,
                State = State,
                CustomerName = CustomerName,
                CustomerAddress = CustomerAddress,
                CustomerPhone = CustomerPhone,
                Status = SaleStatus,
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow,
            };

            // Adiciona itens
            var items = new List<SaleItem>();
            foreach (var i in Items)
            {
                items.Add(new SaleItem
                {
                    Product = i.Product,
                    UnitPrice = i.UnitPrice,
                    Quantity = i.Quantity
                });
            }
            sale.SetItems(items);
            sale.ApplyDiscount(Discount);

            // Adiciona pagamentos (se houver)
            foreach (var p in Payments)
            {
                sale.AddPayment(new SalePayment
                {
                    PaymentDate = p.PaymentDate,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod
                });
            }

            return sale;
        }
    }

    public class CreatedSalesItem
    {
        public ProductType Product { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
    }

    public class CreatedSalesPayment
    {
        public DateOnly PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
    }
}
