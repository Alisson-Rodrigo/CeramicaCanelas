using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Exception;
using MediatR;


namespace CeramicaCanelas.Application.Features.Sales.Commands.CreatedSalesCommand
{
    public class CreatedSalesCommandHandler : IRequestHandler<CreatedSalesCommand, Guid>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;

        public CreatedSalesCommandHandler(ILogged logged, ISalesRepository salesRepository)
        {
            _logged = logged;
            _salesRepository = salesRepository;
        }

        public async Task<Guid> Handle(CreatedSalesCommand request, CancellationToken cancellationToken)
        {
            // Autenticação, como no Launch
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            if (await _salesRepository.ExistsActiveNoteNumberAsync(request.NoteNumber, cancellationToken))
                throw new BadRequestException($"Já existe uma venda ativa com o número {request.NoteNumber}. Inative a existente ou informe outro número.");

            // Validação FluentValidation (mesma pegada do Launch)
            var validator = new CreatedSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // Monta entidade
            var sale = request.AssignToSale();

            // Persiste
            await _salesRepository.CreateAsync(sale, cancellationToken);

            return sale.Id;
        }
    }
}
