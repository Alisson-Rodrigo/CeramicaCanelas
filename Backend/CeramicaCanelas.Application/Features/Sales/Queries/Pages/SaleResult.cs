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
        public DateTime SaleDate { get; set; }  // agora já convertido para SP
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
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

            // Converter de UTC -> São Paulo
            var tz = GetSaoPauloTz();
            SaleDate = TimeZoneInfo.ConvertTimeFromUtc(s.Date, tz);

            City = s.City;
            State = s.State;
            CustomerName = s.CustomerName;
            CustomerPhone = s.CustomerPhone;
            PaymentMethod = s.PaymentMethod;
            Status = s.Status;
            TotalGross = s.TotalGross;
            Discount = s.Discount;
            TotalNet = s.TotalNet;
            ItemsCount = s.Items?.Count ?? 0;
            Items = s.Items.ToList();
        }

        private static TimeZoneInfo GetSaoPauloTz()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
            }
            catch
            {
                // fallback para Windows
                return TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
            }
        }
    }
}
