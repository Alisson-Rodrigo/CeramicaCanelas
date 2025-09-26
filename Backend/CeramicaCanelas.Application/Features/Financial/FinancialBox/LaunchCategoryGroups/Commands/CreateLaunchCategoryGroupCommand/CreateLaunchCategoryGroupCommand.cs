using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategoryGroups.Commands.CreateLaunchCategoryGroupCommand
{
    public class CreateLaunchCategoryGroupCommand : IRequest<Unit>
    {
        public string Name { get; set; } = string.Empty;
    }
}
