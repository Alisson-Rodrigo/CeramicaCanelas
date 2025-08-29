using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Domain.Entities;
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
            var user = await _logged.UserLogged();
            if (user == null) throw new UnauthorizedAccessException("Usuário não autenticado.");

            var validator = new UpdateSalesCommandValidator();
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (!validation.IsValid) throw new BadRequestException(validation);

            // Carrega a venda + itens (rastreados)
            var sale = await _salesRepository.QueryAllWithIncludes()
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

            if (sale == null) throw new BadRequestException("Venda não encontrada.");

            // Duplicidade de número de nota (se mudou)
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
            sale.PaymentMethod = request.PaymentMethod;
            sale.Status = request.Status;

            // ---- ITENS: diff & patch ----
            var itemsById = sale.Items.ToDictionary(i => i.Id, i => i);

            // Atualiza ou adiciona
            foreach (var dto in request.Items)
            {
                if (dto.Id.HasValue)
                {
                    // Verifica se o item com esse Id realmente pertence à venda
                    if (!itemsById.ContainsKey(dto.Id.Value))
                    {
                        throw new BadRequestException($"O item com ID {dto.Id.Value} não pertence à venda.");
                    }

                    // Atualiza o item existente
                    var existing = itemsById[dto.Id.Value];
                    existing.Product = dto.Product;
                    existing.UnitPrice = dto.UnitPrice;
                    existing.Quantity = dto.Quantity;
                    existing.ModifiedOn = DateTime.UtcNow;
                }
                else
                {
                    // Adiciona novo item
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

            // Remover os que não vieram no DTO
            var dtoIds = request.Items.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();
            var toRemove = sale.Items.Where(i => !dtoIds.Contains(i.Id)).ToList();
            foreach (var r in toRemove)
            {
                // Remoção por orfandade (configure o relacionamento para deletar órfãos)
                sale.Items.Remove(r);
            }

            // Totais e metadados
            sale.ApplyDiscount(request.Discount);
            sale.ModifiedOn = DateTime.UtcNow;

            // Persiste usando o que sua interface oferece
            await _salesRepository.Update(sale);

            return Unit.Value;
        }



    }
}
