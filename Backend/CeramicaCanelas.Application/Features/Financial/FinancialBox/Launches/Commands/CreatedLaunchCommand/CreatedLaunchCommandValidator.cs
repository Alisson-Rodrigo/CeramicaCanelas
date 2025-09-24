using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.CreatedLaunchCommand
{
    public class CreatedLaunchCommandValidator : AbstractValidator<CreatedLaunchCommand>
    {
        public CreatedLaunchCommandValidator()
        {
            RuleFor(l => l.Description)
                .NotEmpty().WithMessage("A descrição é obrigatória.")
                .MaximumLength(200).WithMessage("A descrição não pode exceder 200 caracteres.");

            RuleFor(l => l.Type)
                .IsInEnum().WithMessage("O tipo de lançamento é inválido.");

            RuleFor(l => l.PaymentMethod)
                .IsInEnum().WithMessage("A forma de pagamento é inválida.");

            RuleFor(l => l.Status)
                .IsInEnum().WithMessage("O status do pagamento é inválido.");

        }
    }
}
