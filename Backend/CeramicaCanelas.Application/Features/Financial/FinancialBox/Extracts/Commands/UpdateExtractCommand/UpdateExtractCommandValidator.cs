using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.UpdateExtractCommand
{
    public class UpdateExtractCommandValidator : AbstractValidator<UpdateExtractCommand>
    {
        public UpdateExtractCommandValidator()
        {
            RuleFor(e => e.Id)
                .NotEmpty().WithMessage("O ID do extrato é obrigatório.");

            RuleFor(e => e.PaymentMethod)
                .IsInEnum().WithMessage("A forma de pagamento é inválida.");

            RuleFor(e => e.Date)
                .NotEmpty().WithMessage("A data é obrigatória.");

            RuleFor(e => e.Value)
                .GreaterThanOrEqualTo(0).WithMessage("O valor não pode ser negativo.");

            RuleFor(e => e.Observations)
                .MaximumLength(255).WithMessage("As observações não podem exceder 255 caracteres.");
        }
    }
}
