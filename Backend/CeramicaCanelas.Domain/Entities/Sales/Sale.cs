using CeramicaCanelas.Domain.Abstract;          // BaseEntity
using CeramicaCanelas.Domain.Enums;             // SaleStatus
using CeramicaCanelas.Domain.Enums.Sales;
using System;
using System.Collections.Generic;
using System.Linq;
using PaymentMethod = CeramicaCanelas.Domain.Enums.Financial.PaymentMethod; // seu PaymentMethod

namespace CeramicaCanelas.Domain.Entities
{
    public class Sale : BaseEntity
    {
        // Soft-delete
        public bool IsActive { get; set; } = true;

        // Data da venda (mantemos separado de CreatedOn/ModifiedOn)
        public DateTime Date { get; set; } = DateTime.UtcNow;

        // Cabeçalho
        public int NoteNumber { get; set; }                 // Nº da nota/talão
        public string City { get; set; } = string.Empty;    // Cidade
        public string State { get; set; } = string.Empty;   // UF
        public string? CustomerName { get; set; }
        public string? CustomerAddress { get; set; }
        public string? CustomerPhone { get; set; }

        // Pagamento/Status
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Dinheiro;
        public SaleStatus Status { get; set; } = SaleStatus.Pending;

        // Totais
        public decimal TotalGross { get; private set; }
        public decimal Discount { get; private set; }
        public decimal TotalNet { get; private set; }

        // Itens
        public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();

        // --- Regras ---
        public void ApplyDiscount(decimal discount)
        {
            if (discount < 0) throw new ArgumentOutOfRangeException(nameof(discount));
            Discount = discount;
            RecalculateTotals();
            ModifiedOn = DateTime.UtcNow;
        }

        public void RecalculateTotals()
        {
            TotalGross = Items.Sum(i => i.Subtotal);
            TotalNet = Math.Max(0, TotalGross - Discount);
        }

        public void SetItems(IEnumerable<SaleItem> items)
        {
            Items = items.ToList();
            RecalculateTotals();
            ModifiedOn = DateTime.UtcNow;
        }

        // --- Soft-delete helpers ---
        public void Deactivate()
        {
            IsActive = false;
            ModifiedOn = DateTime.UtcNow;
        }

        public void Activate()
        {
            IsActive = true;
            ModifiedOn = DateTime.UtcNow;
        }
    }
}
