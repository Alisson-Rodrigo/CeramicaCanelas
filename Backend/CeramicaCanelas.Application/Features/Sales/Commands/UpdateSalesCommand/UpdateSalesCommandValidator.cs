using FluentValidation;

namespace CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand
{
    public class UpdateSalesCommandValidator : AbstractValidator<UpdateSalesCommand>
    {
        public UpdateSalesCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("O ID da venda é obrigatório.");



            RuleFor(x => x.City)
                .NotEmpty().WithMessage("Cidade é obrigatória.")
                .MaximumLength(80);

            RuleFor(x => x.State)
                .NotEmpty().WithMessage("UF é obrigatória.")
                .MaximumLength(2);

            RuleFor(x => x.Status)
                .IsInEnum().WithMessage("Status inválido.");

            RuleFor(x => x.Discount)
                .GreaterThanOrEqualTo(0).WithMessage("Desconto não pode ser negativo.");

            RuleFor(x => x.Items)
                .NotEmpty().WithMessage("A venda deve possuir ao menos um item.");

            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.Product)
                    .IsInEnum().WithMessage("Produto inválido.");
                item.RuleFor(i => i.UnitPrice)
                    .GreaterThanOrEqualTo(0).WithMessage("Valor unitário inválido.");
                item.RuleFor(i => i.Quantity)
                    .GreaterThan(0).WithMessage("Quantidade deve ser maior que zero.");
            });

            // ✅ Nova validação para pagamentos
            RuleForEach(x => x.Payments).ChildRules(payment =>
            {
                payment.RuleFor(p => p.PaymentMethod)
                    .IsInEnum().WithMessage("Forma de pagamento inválida.");

                payment.RuleFor(p => p.PaymentDate)
                    .NotEmpty().WithMessage("A data do pagamento é obrigatória.");
            });
        }
    }
}
