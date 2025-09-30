using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Exception;
using MediatR;
using Microsoft.EntityFrameworkCore;

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
            var user = await _logged.UserLogged();
            if (user == null) throw new UnauthorizedAccessException("Usuário não autenticado.");

            var validator = new UpdateSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid) throw new BadRequestException(validation);

            // Carrega venda com itens e pagamentos
            var sale = await _salesRepository.QueryAllWithIncludes()
                .Include(s => s.Items)
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

            if (sale == null) throw new BadRequestException("Venda não encontrada.");

            // Checa duplicidade de número de nota
            if (sale.NoteNumber != request.NoteNumber)
            {
                var exists = await _salesRepository.ExistsActiveNoteNumberAsync(request.NoteNumber, cancellationToken);
                if (exists) throw new BadRequestException($"Já existe uma venda ativa com o número {request.NoteNumber}.");
            }

            // Cabeçalho
            sale.NoteNumber = request.NoteNumber;
            sale.City = request.City;
            sale.State = request.State;
            sale.CustomerName = request.CustomerName;
            sale.CustomerAddress = request.CustomerAddress;
            sale.CustomerPhone = request.CustomerPhone;
            if (request.Date.HasValue) sale.Date = request.Date.Value;
            sale.Status = request.Status;

            // ---- ITENS ----
            var itemsById = sale.Items.ToDictionary(i => i.Id, i => i);
            foreach (var dto in request.Items)
            {
                if (dto.Id.HasValue && itemsById.ContainsKey(dto.Id.Value))
                {
                    var existing = itemsById[dto.Id.Value];
                    existing.Product = dto.Product;
                    existing.UnitPrice = dto.UnitPrice;
                    existing.Quantity = dto.Quantity;
                    existing.ModifiedOn = DateTime.UtcNow;
                }
                else
                {
                    sale.Items.Add(new SaleItem
                    {
                        Id = Guid.NewGuid(),
                        Product = dto.Product,
                        UnitPrice = dto.UnitPrice,
                        Quantity = dto.Quantity,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    });
                }
            }
            var dtoItemIds = request.Items.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();
            var toRemoveItems = sale.Items.Where(i => !dtoItemIds.Contains(i.Id)).ToList();
            foreach (var r in toRemoveItems) sale.Items.Remove(r);

            // ---- PAGAMENTOS ----
            var paymentsById = sale.Payments.ToDictionary(p => p.Id, p => p);
            foreach (var dto in request.Payments)
            {
                if (dto.Id.HasValue && paymentsById.ContainsKey(dto.Id.Value))
                {
                    var existing = paymentsById[dto.Id.Value];
                    existing.PaymentDate = dto.PaymentDate;
                    existing.Amount = dto.Amount;
                    existing.PaymentMethod = dto.PaymentMethod;
                    existing.ModifiedOn = DateTime.UtcNow;
                }
                else
                {
                    sale.Payments.Add(new SalePayment
                    {
                        Id = Guid.NewGuid(),
                        PaymentDate = dto.PaymentDate,
                        Amount = dto.Amount,
                        PaymentMethod = dto.PaymentMethod,
                        CreatedOn = DateTime.UtcNow,
                        ModifiedOn = DateTime.UtcNow
                    });
                }
            }
            var dtoPaymentIds = request.Payments.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();
            var toRemovePayments = sale.Payments.Where(p => !dtoPaymentIds.Contains(p.Id)).ToList();
            foreach (var r in toRemovePayments) sale.Payments.Remove(r);

            // Totais e desconto
            sale.ApplyDiscount(request.Discount);
            sale.ModifiedOn = DateTime.UtcNow;

            await _salesRepository.Update(sale);

            return Unit.Value;
        }
    }
}
