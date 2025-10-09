using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Exception;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.CreatedSalesCommand
{
    public class CreatedSalesCommandHandler : IRequestHandler<CreatedSalesCommand, Guid>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;
        private readonly ISalesItemsRepository _saleItemsRepository;
        private readonly ISalesPaymentsRepository _salesPaymentsRepository;

        public CreatedSalesCommandHandler(
            ILogged logged,
            ISalesRepository salesRepository,
            ISalesItemsRepository saleItemsRepository,
            ISalesPaymentsRepository salesPaymentsRepository)
        {
            _logged = logged;
            _salesRepository = salesRepository;
            _saleItemsRepository = saleItemsRepository;
            _salesPaymentsRepository = salesPaymentsRepository;
        }

        public async Task<Guid> Handle(CreatedSalesCommand request, CancellationToken cancellationToken)
        {
            // 🔹 1) Autenticação
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // 🔹 2) Verifica duplicidade de número de nota
            if (await _salesRepository.ExistsActiveNoteNumberAsync(request.NoteNumber, cancellationToken))
                throw new BadRequestException($"Já existe uma venda ativa com o número {request.NoteNumber}.");

            // 🔹 3) Validação
            var validator = new CreatedSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // 🔹 4) Cria a venda (ainda sem totais)
            var sale = request.AssignToSale();
            await _salesRepository.CreateAsync(sale, cancellationToken);

            // 🔹 5) Cria os itens vinculando o SaleId
            // 🔹 5) Cria os itens vinculando o SaleId
            foreach (var i in request.Items)
            {
                var item = new SaleItem
                {
                    SaleId = sale.Id,
                    Product = i.Product,
                    UnitPrice = i.UnitPrice,
                    Quantity = i.Quantity
                    Break = i.Break
                    // Subtotal é calculado automaticamente
                };
                await _saleItemsRepository.CreateAsync(item, cancellationToken);
            }

            // 🔹 6) Atualiza os totais da venda com base nos itens
            sale.RecalculateTotals();

            // ✅ Atualiza a venda com os totais calculados
            await _salesRepository.Update(sale);


            // 🔹 7) Cria os pagamentos vinculando o SaleId
            if (request.Payments?.Any() == true)
            {
                foreach (var p in request.Payments)
                {
                    var payment = new SalePayment
                    {
                        SaleId = sale.Id,
                        PaymentDate = p.PaymentDate,
                        Amount = p.Amount,
                        PaymentMethod = p.PaymentMethod
                    };

                    // Usa a lógica de domínio (atualiza status internamente)
                    sale.AddPayment(payment);

                    // Persiste o pagamento
                    await _salesPaymentsRepository.CreateAsync(payment, cancellationToken);
                }
            }

            // 🔄 Atualiza status e timestamps da venda após todos os pagamentos
            await _salesRepository.Update(sale);



            return sale.Id;
        }
    }
}
