using CeramicaCanelas.Domain.Entities;
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

        // Pagamento
        public PaymentMethod PaymentMethod { get; set; }

        // Desconto (R$)
        public decimal Discount { get; set; } = 0m;

        // Itens
        public List<CreatedSalesItem> Items { get; set; } = new();

        /// <summary>
        /// Mapeia o comando para a entidade de domínio Sale.
        /// </summary>
        public Sale AssignToSale()
        {
            var sale = new Sale
            {
                NoteNumber = NoteNumber,
                Date = DateTime.UtcNow,
                City = City,
                State = State,
                CustomerName = CustomerName,
                CustomerAddress = CustomerAddress,
                CustomerPhone = CustomerPhone,
                PaymentMethod = PaymentMethod,
                Status = SaleStatus.Confirmed,   // ajuste se quiser começar como Pending
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow,
            };

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
            return sale;
        }
    }

    public class CreatedSalesItem
    {
        public ProductType Product { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
    }
}


