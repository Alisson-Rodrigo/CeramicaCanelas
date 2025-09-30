using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.PaySalesCommand
{
    public class PaySalesCommand : IRequest<Unit>
    {
        public Guid SaleId { get; set; }

        /// <summary>
        /// Valor do pagamento realizado.
        /// </summary>
        public decimal Amount { get; set; }

        /// <summary>
        /// Método de pagamento (dinheiro, cartão, etc.).
        /// </summary>
        public PaymentMethod PaymentMethod { get; set; }

        /// <summary>
        /// Data do pagamento (opcional, default = hoje).
        /// </summary>
        public DateOnly? PaymentDate { get; set; }
    }
}
