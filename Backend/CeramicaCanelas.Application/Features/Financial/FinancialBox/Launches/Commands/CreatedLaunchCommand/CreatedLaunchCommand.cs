using CeramicaCanelas.Domain.Entities.Financial;
using CeramicaCanelas.Domain.Enums.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.CreatedLaunchCommand
{
    // Assim como o CreateProductCommand, ele implementa IRequest<Guid> 
    // para indicar que retornará o Id do novo lançamento criado.
    public class CreatedLaunchCommand : IRequest<Unit>
    {
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateOnly LaunchDate { get; set; }
        public LaunchType Type { get; set; }
        public Guid? CategoryId { get; set; }
        public Guid? CustomerId { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public PaymentStatus Status { get; set; }
        public DateOnly? DueDate { get; set; }

        /// <summary>
        /// Método responsável por mapear os dados deste comando para uma nova entidade Launch.
        /// </summary>
        /// <returns>Uma nova instância de Launch.</returns>
        public Launch AssignToLaunch()
        {
            return new Launch
            {
                Description = Description,
                Amount = Amount,
                LaunchDate = LaunchDate,
                Type = Type,
                CategoryId = CategoryId,
                CustomerId = CustomerId,
                PaymentMethod = PaymentMethod,
                Status = Status,
                DueDate = DueDate,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow
                // As propriedades da BaseEntity como CreatedOn e ModifiedOn
                // são preenchidas automaticamente se o construtor da BaseEntity as definir.
            };
        }
    }
}
