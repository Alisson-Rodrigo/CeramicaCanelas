using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Enums.Sales;
using CeramicaCanelas.Domain.Exception;
using MediatR;


namespace CeramicaCanelas.Application.Features.Sales.Commands.PaySalesCommand
{
    public class PaySalesCommandHandler : IRequestHandler<PaySalesCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;

        public PaySalesCommandHandler(ILogged logged, ISalesRepository salesRepository)
        {
            _logged = logged;
            _salesRepository = salesRepository;
        }

        public async Task<Unit> Handle(PaySalesCommand request, CancellationToken cancellationToken)
        {
            // 1) Autenticação
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // 2) Validação
            var validator = new PaySalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // 3) Carrega somente vendas ativas
            var sale = await _salesRepository.GetByIdAsync(request.Id);
            if (sale is null)
                throw new BadRequestException("Venda não encontrada ou inativa.");

            // 4) Regras de status
            if (sale.Status == SaleStatus.Cancelled)
                throw new BadRequestException("Não é possível marcar como paga uma venda cancelada.");

            if (sale.Status == SaleStatus.Confirmed)
                return Unit.Value; // idempotente: já está paga

            // 5) Marca como paga
            sale.Status = SaleStatus.Confirmed;
            sale.ModifiedOn = DateTime.UtcNow;

            await _salesRepository.Update(sale);
            return Unit.Value;
        }
    }
}
