using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand
{
    public class UpdateSalesCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }

        // Cabeçalho
        public int NoteNumber { get; set; }
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerAddress { get; set; }
        public string? CustomerPhone { get; set; }

        public DateOnly? Date { get; set; } // opcional, preserva se não for passado

        // Status
        public SaleStatus Status { get; set; }

        // Totais
        public decimal Discount { get; set; } = 0m;

        // Itens
        public List<UpdateSalesItem> Items { get; set; } = new();

        // Pagamentos
        public List<UpdateSalesPayment> Payments { get; set; } = new();
    }

    public class UpdateSalesItem
    {
        public Guid? Id { get; set; }
        public ProductType Product { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
    }

    public class UpdateSalesPayment
    {
        public Guid? Id { get; set; }
        public DateOnly PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
    }
}
