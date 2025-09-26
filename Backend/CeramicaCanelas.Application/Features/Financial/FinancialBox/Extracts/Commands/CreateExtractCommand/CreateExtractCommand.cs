using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.CreateExtractCommand
{
    public class CreateExtractCommand : IRequest<Unit>
    {
        public PaymentMethod PaymentMethod { get; set; }
        public DateOnly Date { get; set; }
        public decimal Value { get; set; }
        public string? Observations { get; set; }

        /// <summary>
        /// Mapeia o comando para a entidade Extract.
        /// </summary>
        public Extract AssignToExtract()
        {
            return new Extract
            {
                PaymentMethod = PaymentMethod,
                Date = Date,
                Value = Value,
                Observations = Observations,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow
            };
        }
    }
}
