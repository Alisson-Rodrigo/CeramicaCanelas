using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Enums.Sales;
using CeramicaCanelas.Domain.Exception;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.PaySalesCommand
{
    public class PaySalesCommandHandler : IRequestHandler<PaySalesCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;
        private readonly ISalesPaymentsRepository _salesPaymentsRepository;

        public PaySalesCommandHandler(
            ILogged logged,
            ISalesRepository salesRepository,
            ISalesPaymentsRepository salesPaymentsRepository)
        {
            _logged = logged;
            _salesRepository = salesRepository;
            _salesPaymentsRepository = salesPaymentsRepository;
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

            // 3) Carregar venda
            var sale = await _salesRepository.GetByIdWithPaymentsAsync(request.SaleId, cancellationToken);
            if (sale is null || !sale.IsActive)
                throw new BadRequestException("Venda não encontrada ou inativa.");

            if (sale.Status == SaleStatus.Cancelled)
                throw new BadRequestException("Não é possível pagar uma venda cancelada.");

            // 4) Criar pagamento
            var payment = new SalePayment
            {
                SaleId = sale.Id,
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                PaymentDate = request.PaymentDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow

            };

            await _salesPaymentsRepository.CreateAsync(payment, cancellationToken);

            var totalPaid = await _salesPaymentsRepository.SumBySaleIdAsync(sale.Id, cancellationToken);

            // Atualiza status com base no total pago
            if (totalPaid <= 0)
                sale.Status = SaleStatus.Pending;
            else if (totalPaid < sale.TotalNet)
                sale.Status = SaleStatus.PartiallyPaid;
            else
                sale.Status = SaleStatus.Confirmed;

            sale.ModifiedOn = DateTime.UtcNow;
            await _salesRepository.Update(sale);



            return Unit.Value;
        }
    }
}
