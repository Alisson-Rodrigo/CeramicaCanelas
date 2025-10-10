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
        public DateOnly SaleDate { get; set; }
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }

        public List<SalePaymentResult> Payments { get; set; } = new();

        public SaleStatus Status { get; set; }
        public decimal TotalGross { get; set; }
        public decimal Discount { get; set; }
        public decimal TotalNet { get; set; }

        // ✅ novos campos
        public decimal TotalPaid { get; set; }
        public decimal RemainingBalance { get; set; }

        public int ItemsCount { get; set; }
        public List<SaleItemResult> Items { get; set; } = new();

        public SaleResult(Sale s)
        {
            Id = s.Id;
            NoteNumber = s.NoteNumber;
            SaleDate = s.Date;
            City = s.City;
            State = s.State;
            CustomerName = s.CustomerName;
            CustomerPhone = s.CustomerPhone;

            // Pagamentos
            Payments = s.Payments?
                .Select(p => new SalePaymentResult
                {
                    PaymentMethod = p.PaymentMethod,
                    Amount = p.Amount,
                    Date = DateOnly.FromDateTime(p.CreatedOn.Date)
                })
                .ToList() ?? new List<SalePaymentResult>();

            Status = s.Status;
            TotalGross = s.TotalGross;
            Discount = s.Discount;
            TotalNet = s.TotalNet;

            // ✅ calcula os novos campos
            TotalPaid = s.Payments?.Sum(p => p.Amount) ?? 0m;
            RemainingBalance = Math.Max(0, TotalNet - TotalPaid);

            ItemsCount = s.Items?.Count ?? 0;
            Items = s.Items?
                .Select(i => new SaleItemResult
                {
                    Id = i.Id,
                    Product = i.Product.ToString(),
                    UnitPrice = i.UnitPrice,
                    Quantity = i.Quantity,
                    Subtotal = i.Subtotal,
                    Break = i.Break
                })
                .ToList() ?? new List<SaleItemResult>();
        }
    }

    public class SalePaymentResult
    {
        public PaymentMethod PaymentMethod { get; set; }
        public decimal Amount { get; set; }
        public DateOnly? Date { get; set; }
    }
}
