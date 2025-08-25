using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand
{
    public class UpdateSalesCommandHandler : IRequestHandler<UpdateSalesCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;

        public UpdateSalesCommandHandler(ILogged logged, ISalesRepository salesRepository)
        {
            _logged = logged;
            _salesRepository = salesRepository;
        }

        public async Task<Unit> Handle(UpdateSalesCommand request, CancellationToken cancellationToken)
        {
            // 1) Autenticação
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // 2) Validação
            var validator = new UpdateSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // 3) Carrega a venda existente
            var sale = await _salesRepository.GetByIdAsync(request.Id);
            if (sale == null)
                throw new BadRequestException("Venda não encontrada.");

            // 4) Checa duplicidade de NoteNumber (somente se mudou)
            if (sale.NoteNumber != request.NoteNumber)
            {
                var exists = await _salesRepository.ExistsActiveNoteNumberAsync(request.NoteNumber, cancellationToken);
                if (exists)
                    throw new BadRequestException($"Já existe uma venda ativa com o número {request.NoteNumber}. Inative a existente ou use outro número.");
            }

            // 5) Aplica alterações na entidade (estilo MapToLaunch)
            request.MapToSale(sale); // atualiza campos + itens + totais

            // 6) Persiste com proteção à concorrência (índice único)
            await _salesRepository.Update(sale);

            return Unit.Value;
        }
    }
}
