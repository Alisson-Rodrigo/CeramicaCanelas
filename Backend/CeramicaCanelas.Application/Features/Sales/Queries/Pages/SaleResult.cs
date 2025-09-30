using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums.Financial;
using CeramicaCanelas.Domain.Enums.Sales;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CeramicaCanelas.Application.Features.Sales.Queries.Pages
{
    public class SaleResult
    {
        public Guid Id { get; set; }
        public int NoteNumber { get; set; }
        public DateOnly SaleDate { get; set; }  // sem hora
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }

        // Agora não é mais um único PaymentMethod
        public List<SalePaymentResult> Payments { get; set; } = new();

        public SaleStatus Status { get; set; }
        public decimal TotalGross { get; set; }
        public decimal Discount { get; set; }
        public decimal TotalNet { get; set; }
        public int ItemsCount { get; set; }
        public List<SaleItem> Items { get; set; } = new(); // Itens da venda

        public SaleResult(Sale s)
        {
            Id = s.Id;
            NoteNumber = s.NoteNumber;

            SaleDate = s.Date;
            City = s.City;
            State = s.State;
            CustomerName = s.CustomerName;
            CustomerPhone = s.CustomerPhone;

            // Mapear os pagamentos da venda
            Payments = s.Payments?
                .Select(p => new SalePaymentResult
                {
                    PaymentMethod = p.PaymentMethod,
                    Amount = p.Amount,
                    Date = DateOnly.FromDateTime(p.CreatedOn.Date) // ✅ usa CreatedOn
                })
                .ToList() ?? new List<SalePaymentResult>();

            Status = s.Status;
            TotalGross = s.TotalGross;
            Discount = s.Discount;
            TotalNet = s.TotalNet;
            ItemsCount = s.Items?.Count ?? 0;
            Items = s.Items.ToList();
        }
    }

    public class SalePaymentResult
    {
        public PaymentMethod PaymentMethod { get; set; }
        public decimal Amount { get; set; }
        public DateOnly Date { get; set; }
    }
}
