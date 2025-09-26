using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.DeleteExtractCommand
{
    public class DeleteExtractCommandValidator : AbstractValidator<DeleteExtractCommand>
    {
        public DeleteExtractCommandValidator()
        {
            RuleFor(e => e.Id)
                .NotEmpty().WithMessage("O ID do extrato é obrigatório para a exclusão.");
        }
    }
}
