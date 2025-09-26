using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.DeleteLaunchCategoryGroupCommand
{
    public class DeleteLaunchCategoryGroupCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
    }
}
