using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Commands.CreatedSalesCommand
{
    public class CreatedSalesCommandValidator : AbstractValidator<CreatedSalesCommand>
    {
        public CreatedSalesCommandValidator()
        {
            RuleFor(x => x.NoteNumber)
                .GreaterThan(0).WithMessage("O número da nota deve ser maior que zero.");

            RuleFor(x => x.City)
                .NotEmpty().WithMessage("Cidade é obrigatória.")
                .MaximumLength(80);

            RuleFor(x => x.State)
                .NotEmpty().WithMessage("UF é obrigatória.")
                .MaximumLength(2);

            RuleFor(x => x.Payments)
                .NotEmpty().WithMessage("A venda deve possuir pelo menos um pagamento.");

            RuleForEach(x => x.Payments).ChildRules(payment =>
            {
                payment.RuleFor(p => p.PaymentMethod)
                    .IsInEnum().WithMessage("Forma de pagamento inválida.");

                payment.RuleFor(p => p.Amount)
                    .GreaterThan(0).WithMessage("O valor do pagamento deve ser maior que zero.");
            });

            RuleFor(x => x.Discount)
                .GreaterThanOrEqualTo(0).WithMessage("Desconto não pode ser negativo.");

            RuleFor(x => x.Items)
                .NotEmpty().WithMessage("A venda deve possuir ao menos um item.");

            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.Product)
                    .IsInEnum().WithMessage("Produto inválido.");

                item.RuleFor(i => i.Quantity)
                    .GreaterThan(0).WithMessage("Quantidade deve ser maior que zero.");
            });
        }
    }
}
