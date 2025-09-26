using CeramicaCanelas.Domain.Entities.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategories.Commands.CreateLaunchCategoryCommand
{
    public class CreateLaunchCategoryCommand : IRequest<Unit>
    {
        public string Name { get; set; } = string.Empty;
        public Guid? GroupId { get; set; }

        public LaunchCategory AssignToEntity()
        {
            return new LaunchCategory
            {
                Name = Name,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow,
                GroupId = GroupId,
                IsDeleted = false
            };
        }
    }
}
