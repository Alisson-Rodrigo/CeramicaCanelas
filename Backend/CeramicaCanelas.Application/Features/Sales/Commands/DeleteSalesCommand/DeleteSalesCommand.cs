using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Commands.DeleteSalesCommand
{
    public class DeleteSalesCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
    }
}
