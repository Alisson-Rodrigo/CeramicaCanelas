using CeramicaCanelas.Domain.Abstract;  // BaseEntity
using CeramicaCanelas.Domain.Enums;     // ProductType
using CeramicaCanelas.Domain.Enums.Sales;
using System;

namespace CeramicaCanelas.Domain.Entities
{
    public class SaleItem : BaseEntity
    {
        // FK para a venda
        public Guid SaleId { get; set; }
        public Sale Sale { get; set; }

        // Produto (enum fixo)
        public ProductType Product { get; set; }

        // Valores
        public decimal UnitPrice { get; set; }
        public decimal Quantity { get; set; }
        public int Break { get; set; } = 0; // Quebra (apenas para ladrilhos)

        // Calculado
        public decimal Subtotal => Math.Round(UnitPrice * Quantity, 2);
    }
}
