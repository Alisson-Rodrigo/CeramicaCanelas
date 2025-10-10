using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Exception;
using MediatR;

namespace CeramicaCanelas.Application.Features.Sales.Commands.UpdateSalesCommand
{
    public class UpdateSalesCommandHandler : IRequestHandler<UpdateSalesCommand, Unit>
    {
        private readonly ILogged _logged;
        private readonly ISalesRepository _salesRepository;
        private readonly ISalesItemsRepository _saleItemsRepository;
        private readonly ISalesPaymentsRepository _salesPaymentsRepository;

        public UpdateSalesCommandHandler(
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

        public async Task<Unit> Handle(UpdateSalesCommand request, CancellationToken cancellationToken)
        {
            // 1️⃣ Autenticação
            var user = await _logged.UserLogged();
            if (user == null)
                throw new UnauthorizedAccessException("Usuário não autenticado.");

            // 2️⃣ Validação FluentValidation
            var validator = new UpdateSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid)
                throw new BadRequestException(validation);

            // 3️⃣ Busca a venda principal
            var sale = await _salesRepository.GetByIdAsyncUpdate(request.Id);
            if (sale == null)
                throw new BadRequestException("Venda não encontrada.");

            // 4️⃣ Verifica duplicidade de número de nota
            if (sale.NoteNumber != request.NoteNumber &&
                await _salesRepository.ExistsActiveNoteNumberAsync(request.NoteNumber, cancellationToken))
            {
                throw new BadRequestException($"Já existe uma venda ativa com o número {request.NoteNumber}.");
            }

            // 5️⃣ Atualiza cabeçalho
            sale.NoteNumber = request.NoteNumber;
            sale.City = request.City;
            sale.State = request.State;
            sale.CustomerName = request.CustomerName;
            sale.CustomerAddress = request.CustomerAddress;
            sale.CustomerPhone = request.CustomerPhone;
            if (request.Date.HasValue) sale.Date = request.Date.Value;
            sale.ApplyDiscount(request.Discount, recalcStatus: false);
            sale.Status = request.Status;
            sale.ModifiedOn = DateTime.UtcNow;

            // ⚙️ Atualiza ITENS
            var existingItems = await _saleItemsRepository.FindAsync(i => i.SaleId == sale.Id, cancellationToken);
            var existingItemIds = existingItems.Select(i => i.Id).ToHashSet();
            var dtoItemIds = request.Items.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();

            foreach (var dto in request.Items)
            {
                if (dto.Id.HasValue && existingItemIds.Contains(dto.Id.Value))
                {
                    var item = existingItems.First(i => i.Id == dto.Id.Value);
                    item.Product = dto.Product;
                    item.UnitPrice = dto.UnitPrice;
                    item.Quantity = dto.Quantity;
                    item.ModifiedOn = DateTime.UtcNow;
                    item.Break = dto.Break;
                    await _saleItemsRepository.Update(item);
                }
                else
                {
                    var newItem = new SaleItem
                    {
                        SaleId = sale.Id,
                        Product = dto.Product,
                        UnitPrice = dto.UnitPrice,
                        Quantity = dto.Quantity,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    };
                    await _saleItemsRepository.CreateAsync(newItem, cancellationToken);
                }
            }

            var toRemoveItems = existingItems.Where(i => !dtoItemIds.Contains(i.Id)).ToList();
            foreach (var item in toRemoveItems)
                await _saleItemsRepository.Delete(item);

            // ⚙️ Atualiza PAGAMENTOS
            var existingPayments = await _salesPaymentsRepository.FindAsync(p => p.SaleId == sale.Id, cancellationToken);
            var existingPayIds = existingPayments.Select(p => p.Id).ToHashSet();
            var dtoPayIds = request.Payments.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();

            foreach (var dto in request.Payments)
            {
                if (dto.Id.HasValue && existingPayIds.Contains(dto.Id.Value))
                {
                    var pay = existingPayments.First(p => p.Id == dto.Id.Value);
                    pay.PaymentDate = dto.PaymentDate;
                    pay.Amount = dto.Amount;
                    pay.PaymentMethod = dto.PaymentMethod;
                    pay.ModifiedOn = DateTime.UtcNow;
                    await _salesPaymentsRepository.Update(pay);
                }
                else
                {
                    var newPay = new SalePayment
                    {
                        SaleId = sale.Id,
                        PaymentDate = dto.PaymentDate,
                        Amount = dto.Amount,
                        PaymentMethod = dto.PaymentMethod,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    };
                    await _salesPaymentsRepository.CreateAsync(newPay, cancellationToken);
                }
            }

            var toRemovePayments = existingPayments.Where(p => !dtoPayIds.Contains(p.Id)).ToList();
            foreach (var pay in toRemovePayments)
                await _salesPaymentsRepository.Delete(pay);

            // ✅ Recarrega os itens atualizados da venda
            var updatedItems = await _saleItemsRepository.FindAsync(i => i.SaleId == sale.Id, cancellationToken);

            // Atualiza a lista de itens na entidade e recalcula os totais
            sale.SetItems(updatedItems);  // Este método chama RecalculateTotals()

            // Atualiza a data de modificação
            sale.ModifiedOn = DateTime.UtcNow;

            // ✅ Só agora atualize a venda
            await _salesRepository.Update(sale);

            return Unit.Value;
        }
    }
}