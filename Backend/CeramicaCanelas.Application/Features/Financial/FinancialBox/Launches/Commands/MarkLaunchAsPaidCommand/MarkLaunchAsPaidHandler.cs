using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Launches.Commands.MarkLaunchAsPaidCommand
{
    public class MarkLaunchAsPaidHandler : IRequestHandler<MarkLaunchAsPaidCommand, Unit>
    {
        private readonly ILaunchRepository _launchRepository;

        public MarkLaunchAsPaidHandler(ILaunchRepository launchRepository)
        {
            _launchRepository = launchRepository;
        }

        public async Task<Unit> Handle(MarkLaunchAsPaidCommand request, CancellationToken cancellationToken)
        {
            var launch = await _launchRepository.GetByIdAsync(request.LaunchId);
            if (launch == null || launch.Status == PaymentStatus.Paid)
            {
                throw new BadRequestException("Lançamento não encontrado ou já pago");
            }

            launch.Status = PaymentStatus.Paid;
            launch.LaunchDate = DateOnly.FromDateTime(DateTime.UtcNow);
            await _launchRepository.Update(launch);
            return Unit.Value;
        }
    }
}
