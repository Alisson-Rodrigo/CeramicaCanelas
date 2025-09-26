using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.CreateLaunchCategoryGroupCommand
{
    public class CreateLaunchCategoryGroupCommandValidator : AbstractValidator<CreateLaunchCategoryGroupCommand>
    {
        public CreateLaunchCategoryGroupCommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("O nome é obrigatório.")
                .MaximumLength(100).WithMessage("O nome não pode exceder 100 caracteres.");
        }
    }
}
