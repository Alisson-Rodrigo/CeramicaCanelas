using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Extracts.Commands.DeleteExtractCommand
{
    public class DeleteExtractCommandHandler : IRequestHandler<DeleteExtractCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly IExtractRepository _extractRepository;

        public DeleteExtractCommandHandler(ILogged logged, IExtractRepository extractRepository)
        {
            _logged = logged;
            _extractRepository = extractRepository;
        }

        public async Task<Unit> Handle(DeleteExtractCommand request, CancellationToken cancellationToken)
        {
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            var validator = new DeleteExtractCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);
            if (!validationResult.IsValid)
                throw new BadRequestException(validationResult);

            var extract = await _extractRepository.GetByIdAsync(request.Id);
            if (extract == null)
                throw new BadRequestException("Extrato não encontrado.");

            // Soft delete
            extract.IsActive = false;
            extract.ModifiedOn = DateTime.UtcNow;
            extract.OperatorName = user.UserName!;

            await _extractRepository.Update(extract);

            return Unit.Value;
        }
    }
}
