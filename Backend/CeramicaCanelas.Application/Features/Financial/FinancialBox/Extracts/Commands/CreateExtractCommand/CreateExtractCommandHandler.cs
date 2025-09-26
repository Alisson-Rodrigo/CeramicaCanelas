using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.CreateExtractCommand
{
    public class CreateExtractCommandHandler : IRequestHandler<CreateExtractCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly IExtractRepository _extractRepository;

        public CreateExtractCommandHandler(ILogged logged, IExtractRepository extractRepository)
        {
            _logged = logged;
            _extractRepository = extractRepository;
        }

        public async Task<Unit> Handle(CreateExtractCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            await ValidateExtract(request, cancellationToken);

            var extract = request.AssignToExtract();

            if (extract == null)
                throw new BadRequestException("Erro ao criar o extrato.");

            extract.OperatorName = user.UserName!;

            await _extractRepository.CreateAsync(extract, cancellationToken);

            return Unit.Value;
        }

        private async Task ValidateExtract(CreateExtractCommand request, CancellationToken cancellationToken)
        {
            var validator = new CreateExtractCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);

            if (!validationResult.IsValid)
                throw new BadRequestException(validationResult);
        }
    }
}
