using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand
{
    /// <summary>
    /// Comando responsável por atualizar uma venda existente, incluindo cabeçalho, itens e pagamentos.
    /// </summary>
    public class UpdateSalesCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }

        // --- Cabeçalho ---
        public int NoteNumber { get; set; }
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerAddress { get; set; }
        public string? CustomerPhone { get; set; }

        public DateOnly? Date { get; set; }  // opcional, preserva valor anterior se nulo
        public SaleStatus Status { get; set; }

        // --- Totais ---
        public decimal Discount { get; set; } = 0m;

        // --- Itens e Pagamentos ---
        public List<UpdateSalesItem> Items { get; set; } = new();
        public List<UpdateSalesPayment> Payments { get; set; } = new();
    }

    /// <summary>
    /// DTO auxiliar para atualização dos itens de venda.
    /// </summary>
    public class UpdateSalesItem
    {
        public Guid? Id { get; set; }                  // nulo = item novo
        public ProductType Product { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
    }

    /// <summary>
    /// DTO auxiliar para atualização dos pagamentos de venda.
    /// </summary>
    public class UpdateSalesPayment
    {
        public Guid? Id { get; set; }                  // nulo = pagamento novo
        public DateOnly PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
    }
}
