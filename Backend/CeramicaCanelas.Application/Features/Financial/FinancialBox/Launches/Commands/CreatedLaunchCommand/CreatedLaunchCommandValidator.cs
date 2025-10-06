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

            // 👇 ADICIONE A VALIDAÇÃO PARA OS COMPROVANTES
            RuleForEach(l => l.ImageProofs).ChildRules(file =>
            {
                file.RuleFor(f => f.Length)
                    .LessThanOrEqualTo(5 * 1024 * 1024) // Limite de 5 MB por arquivo
                    .WithMessage("O arquivo é muito grande. O tamanho máximo permitido é 5 MB.");

                file.RuleFor(f => f.ContentType)
                    .Must(BeAValidFileType)
                    .WithMessage("Tipo de arquivo inválido. Apenas imagens (JPG, PNG) e PDF são permitidos.");
            });

        }

        private bool BeAValidFileType(string contentType)
        {
            var allowedTypes = new[] { "image/jpeg", "image/png", "application/pdf" };
            return allowedTypes.Contains(contentType);
        }
    }
}
