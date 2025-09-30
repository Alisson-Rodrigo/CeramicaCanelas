using FluentValidation;

namespace CeramicaCanelas.Application.Features.Sales.Commands.PaySalesCommand
{
    public class PaySalesCommandValidator : AbstractValidator<PaySalesCommand>
    {
        public PaySalesCommandValidator()
        {
            RuleFor(x => x.SaleId)
                .NotEmpty().WithMessage("O ID da venda é obrigatório.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("O valor do pagamento deve ser maior que zero.");

            RuleFor(x => x.PaymentMethod)
                .IsInEnum().WithMessage("Forma de pagamento inválida.");
        }
    }
}
