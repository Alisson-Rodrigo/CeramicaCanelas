using CeramicaCanelas.Domain.Abstract;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Enums.Sales;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CeramicaCanelas.Domain.Entities
{
    public class Sale : BaseEntity
    {
        // Soft-delete
        public bool IsActive { get; set; } = true;

        // Data da venda (mantemos separado de CreatedOn/ModifiedOn)
        public DateOnly Date { get; set; }

        // Cabeçalho
        public int NoteNumber { get; set; }                 // Nº da nota/talão
        public string City { get; set; } = string.Empty;    // Cidade
        public string State { get; set; } = string.Empty;   // UF
        public string? CustomerName { get; set; }
        public string? CustomerAddress { get; set; }        // Corrigido para set
        public string? CustomerPhone { get; set; }

        // Status da venda
        public SaleStatus Status { get; set; } = SaleStatus.Pending;

        // Totais
        public decimal TotalGross { get; private set; }
        public decimal Discount { get; private set; }
        public decimal TotalNet { get; private set; }

        // Itens
        public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();

        // Pagamentos
        public ICollection<SalePayment> Payments { get; set; } = new List<SalePayment>();

        // --- Regras de Pagamento ---
        public decimal GetTotalPaid() => Payments.Sum(p => p.Amount);
        public decimal GetRemainingBalance() => TotalNet - GetTotalPaid();

        public void AddPayment(SalePayment payment)
        {
            if (Status == SaleStatus.Cancelled)
                throw new InvalidOperationException("Não é possível adicionar pagamentos a uma venda cancelada.");

            Payments.Add(payment);
            ModifiedOn = DateTime.UtcNow;

            AtualizarStatus();
        }


        private void AtualizarStatus()
        {
            // 🔒 Protege vendas canceladas
            if (Status == SaleStatus.Cancelled)
                return;

            // ✅ Se for doação, o status é confirmado e não depende de pagamento
            if (Status == SaleStatus.Donation)
            {
                TotalNet = 0; // opcional, garante que o total líquido é zero
                return;
            }

            var totalPago = GetTotalPaid();
            var saldo = GetRemainingBalance();

            if (Payments.Any() && saldo <= 0)
                Status = SaleStatus.Confirmed;
            else if (totalPago > 0)
                Status = SaleStatus.PartiallyPaid;
            else
                Status = SaleStatus.Pending;
        }




        // --- Regras de Totais ---
        public void ApplyDiscount(decimal discount)
        {
            if (discount < 0) throw new ArgumentOutOfRangeException(nameof(discount));
            Discount = discount;
            RecalculateTotals();
            ModifiedOn = DateTime.UtcNow;
        }

        public void RecalculateTotals()
        {
            if (Status == SaleStatus.Donation)
            {
                TotalGross = Items.Sum(i => i.UnitPrice * i.Quantity);
                TotalNet = 0; // doação não tem cobrança
                return;
            }

            TotalGross = Items.Sum(i => i.UnitPrice * i.Quantity);
            TotalNet = Math.Max(0, TotalGross - Discount);
            AtualizarStatus();
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
