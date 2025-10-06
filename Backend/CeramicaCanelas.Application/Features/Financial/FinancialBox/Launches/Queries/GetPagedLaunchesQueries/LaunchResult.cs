using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Queries.GetPagedLaunchesQueries
{
    public class LaunchResult
    {
        public Guid Id { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public DateOnly? LaunchDate { get; set; }
        public LaunchType Type { get; set; }
        public string? CategoryName { get; set; }
        public Guid? CategoryId { get; set; }
        public string? CustomerName { get; set; }
        public Guid? CustomerId { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public PaymentStatus Status { get; set; }

        public List<string>? ImageProofsUrls { get; set; }

        public DateOnly? DueDate { get; set; }
        public string OperatorName { get; set; }


        // Construtor que mapeia a Entidade para o DTO
        public LaunchResult(Launch launch)
        {
            Id = launch.Id;
            Description = launch.Description;
            Amount = launch.Amount;
            LaunchDate = launch.LaunchDate;
            Type = launch.Type;
            CategoryName = launch.Category?.Name; // Acessa o nome da categoria relacionada
            CustomerName = launch.Customer?.Name; // Acessa o nome do cliente relacionado
            CategoryId = launch.CategoryId;
            CustomerId = launch.CustomerId;
            ImageProofsUrls = launch.ImageProofs?.Select(img => img.FileUrl).ToList();
            PaymentMethod = launch.PaymentMethod;
            Status = launch.Status;
            DueDate = launch.DueDate;
            OperatorName = launch.OperatorName;
        }
    }
}
