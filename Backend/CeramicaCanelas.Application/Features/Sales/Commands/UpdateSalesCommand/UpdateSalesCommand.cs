using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand
{
    public class UpdateSalesCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }

        // Cabeçalho
        public int NoteNumber { get; set; }
        // Obs.: Data NÃO vem no update (mantemos a data original da venda)
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerAddress { get; set; }
        public string? CustomerPhone { get; set; }

        // Pagamento/Status
        public PaymentMethod PaymentMethod { get; set; }
        public SaleStatus Status { get; set; }

        // Totais
        public decimal Discount { get; set; } = 0m;

        // Itens
        public List<UpdateSalesItem> Items { get; set; } = new();

        /// <summary>
        /// Aplica os dados do comando na entidade existente.
        /// NÃO altera a data da venda.
        /// </summary>
        public void MapToSale(Sale sale)
        {
            sale.NoteNumber = NoteNumber;
            // sale.Date          = sale.Date; // intencional: preserva a data existente
            sale.City = City;
            sale.State = State;
            sale.CustomerName = CustomerName;
            sale.CustomerAddress = CustomerAddress;
            sale.CustomerPhone = CustomerPhone;
            sale.PaymentMethod = PaymentMethod;
            sale.Status = Status;

            var newItems = Items.Select(i => new SaleItem
            {
                Product = i.Product,
                UnitPrice = i.UnitPrice,
                Quantity = i.Quantity
            }).ToList();

            sale.SetItems(newItems);      // recalcula TotalGross
            sale.ApplyDiscount(Discount); // recalcula TotalNet
            sale.ModifiedOn = DateTime.UtcNow;
        }
    }

    public class UpdateSalesItem
    {
        public Guid? Id { get; set; }                 // <— agora é nullable
        public ProductType Product { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
    }

}
