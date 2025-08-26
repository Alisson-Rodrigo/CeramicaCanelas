using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Commands.DeleteSalesCommand
{
    public class DeleteSalesCommandHandler : IRequestHandler<DeleteSalesCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;

        public DeleteSalesCommandHandler(ILogged logged, ISalesRepository salesRepository)
        {
            _logged = logged;
            _salesRepository = salesRepository;
        }

        public async Task<Unit> Handle(DeleteSalesCommand request, CancellationToken cancellationToken)
        {
            // 1) Autenticação
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // 2) Validação
            var validator = new DeleteSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // 3) Verifica existência (inclusive inativas)
            var sale = await _salesRepository.GetByIdAsync(request.Id);
            if (sale is null)
                throw new BadRequestException("Venda não encontrada.");

            // 4) Soft-delete idempotente
            if (sale.IsActive)
                await _salesRepository.DeactivateAsync(request.Id, cancellationToken);
            // se já estiver inativa, apenas conclui

            return Unit.Value;
        }
    }
}
