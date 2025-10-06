using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using Microsoft.AspNetCore.Http;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.UpdateLaunchCommand
{
    public class UpdateLaunchCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateOnly LaunchDate { get; set; }
        public LaunchType Type { get; set; }
        public Guid? CategoryId { get; set; }
        public Guid? CustomerId { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public PaymentStatus Status { get; set; }
        public DateOnly? DueDate { get; set; }

        // 🆕 Comprovantes enviados na atualização
        public List<IFormFile>? ImageProofs { get; set; }

        /// <summary>
        /// Mapeia dados do comando para uma entidade existente de Launch.
        /// </summary>
        public void MapToLaunch(Launch launchToUpdate)
        {
            launchToUpdate.Description = Description;
            launchToUpdate.Amount = Amount;
            launchToUpdate.LaunchDate = LaunchDate;
            launchToUpdate.Type = Type;
            launchToUpdate.CategoryId = CategoryId;
            launchToUpdate.CustomerId = CustomerId;
            launchToUpdate.PaymentMethod = PaymentMethod;
            launchToUpdate.Status = Status;
            launchToUpdate.DueDate = DueDate;
            launchToUpdate.ModifiedOn = DateTime.UtcNow;
        }
    }
}
