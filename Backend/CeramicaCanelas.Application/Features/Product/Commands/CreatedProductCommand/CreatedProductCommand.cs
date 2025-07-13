﻿using CeramicaCanelas.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;

namespace CeramicaCanelas.Application.Features.Product.Commands.CreatedProductCommand
{
    public class CreatedProductCommand : IRequest<Unit>
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public UnitOfMeasure UnitOfMeasure { get; set; }
        public int StockInitial { get; set; }
        public int StockMinium { get; set; }
        public float Value { get; set; }
        public IFormFile? Imagem { get; set; }
        public bool IsReturnable { get; set; }
        public string Observation { get; set; } = string.Empty;
        public Guid CategoryId { get; set; }

        public Domain.Entities.Products AssignToProducts()
        {
            return new Domain.Entities.Products
            {
                Name = Name,
                Code = Code,
                UnitOfMeasure = UnitOfMeasure,
                StockInitial = StockInitial,
                StockMinium = StockMinium,
                StockCurrent = StockInitial,
                IsReturnable = IsReturnable,
                Observation = Observation,
                CategoryId = CategoryId,
                ValueTotal = Value,

            };
        }

    }
}
