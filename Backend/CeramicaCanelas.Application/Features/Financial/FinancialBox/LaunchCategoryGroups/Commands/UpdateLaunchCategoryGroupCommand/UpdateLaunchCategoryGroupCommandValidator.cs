using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.UpdateLaunchCategoryGroupCommand
{
    public class UpdateLaunchCategoryGroupCommandValidator : AbstractValidator<UpdateLaunchCategoryGroupCommand>
    {
        public UpdateLaunchCategoryGroupCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("O ID é obrigatório.");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("O nome é obrigatório.")
                .MaximumLength(100).WithMessage("O nome não pode exceder 100 caracteres.");
        }
    }
}
