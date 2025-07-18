﻿using MediatR;
using Microsoft.VisualBasic;


namespace CeramicaCanelas.Application.Features.Movimentacoes_ES.Entradas.Command.CreateMovEntradasProductsCommand
{
    public class CreateMovEntradasProductCommand : IRequest<Unit>
    {
        public Guid ProductId { get; set; }
        public Guid SupplierId { get; set; } = Guid.Empty;

        public int Quantity { get; set; }
        public float UnitPrice { get; set; }


        public Domain.Entities.ProductEntry AssignToProductsEntry()
        {
            return new Domain.Entities.ProductEntry
            {
                ProductId = ProductId,
                EntryDate = DateTime.UtcNow,
                Quantity = Quantity,
                UnitPrice = UnitPrice,
                SupplierId = SupplierId,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow

            };
        }
    }
}
