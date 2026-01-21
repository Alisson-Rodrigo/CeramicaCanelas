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
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // Validação (sem NoteNumber)
            var validator = new CreatedSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // Cria a venda
            var sale = request.AssignToSale();

            // 🔥 Gera automaticamente o número da nota
            int nextNoteNumber = await _salesRepository.GetNextNoteNumberAsync(cancellationToken);
            sale.SetNoteNumber(nextNoteNumber);

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
                    Quantity = i.Quantity,
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
                    // ✅ ignora item vazio/incompleto
                    if (p.Amount is null || p.Amount <= 0m) continue;
                    if (p.PaymentMethod is null) continue;
            
                    var payment = new SalePayment
                    {
                        SaleId = sale.Id,
                        PaymentDate = p.PaymentDate,
                        Amount = p.Amount.Value,
                        PaymentMethod = p.PaymentMethod.Value
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
