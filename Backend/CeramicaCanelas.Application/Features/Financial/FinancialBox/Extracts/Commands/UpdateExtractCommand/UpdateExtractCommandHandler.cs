using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.UpdateExtractCommand
{
    public class UpdateExtractCommandHandler : IRequestHandler<UpdateExtractCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly IExtractRepository _extractRepository;

        public UpdateExtractCommandHandler(ILogged logged, IExtractRepository extractRepository)
        {
            _logged = logged;
            _extractRepository = extractRepository;
        }

        public async Task<Unit> Handle(UpdateExtractCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // 1. Validação
            await ValidateExtract(request, cancellationToken);

            // 2. Busca
            var extractToUpdate = await _extractRepository.GetByIdAsync(request.Id);
            if (extractToUpdate == null)
                throw new BadRequestException("Extrato não encontrado.");

            // 3. Mapear dados
            request.MapToExtract(extractToUpdate);
            extractToUpdate.OperatorName = user.UserName!;

            // 4. Atualizar
            await _extractRepository.Update(extractToUpdate);

            return Unit.Value;
        }

        private async Task ValidateExtract(UpdateExtractCommand request, CancellationToken cancellationToken)
        {
            var validator = new UpdateExtractCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);

            if (!validationResult.IsValid)
                throw new BadRequestException(validationResult);
        }
    }
}
