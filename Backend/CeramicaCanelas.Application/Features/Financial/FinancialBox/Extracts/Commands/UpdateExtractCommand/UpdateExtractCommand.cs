using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.UpdateExtractCommand
{
    public class UpdateExtractCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public DateOnly Date { get; set; }
        public decimal Value { get; set; }
        public string? Observations { get; set; }

        /// <summary>
        /// Mapeia os dados deste comando para uma entidade Extract existente.
        /// </summary>
        public void MapToExtract(Extract extractToUpdate)
        {
            extractToUpdate.PaymentMethod = PaymentMethod;
            extractToUpdate.Date = Date;
            extractToUpdate.Value = Value;
            extractToUpdate.Observations = Observations;
            extractToUpdate.ModifiedOn = DateTime.UtcNow;
        }
    }
}
