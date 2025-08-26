using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Commands.PaySalesCommand
{
    public class PaySalesCommandValidator : AbstractValidator<PaySalesCommand>
    {
        public PaySalesCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("O ID da venda é obrigatório.");
        }
    }
}
