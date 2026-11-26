using CeramicaCanelas.Application.Contracts.Persistance.Repositories;
using CeramicaCanelas.Application.Features.Sales.Queries.GetSaleReceiptPdfQuery;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Entities.Sales;
using CeramicaCanelas.Domain.Enums.Financial;
using Microsoft.EntityFrameworkCore;
using Moq;
using Moq.EntityFrameworkCore;
using PdfSharpCore.Pdf.IO;

namespace CeramicaCanelas.Tests.Unit.Sales;

public sealed class SaleReceiptPdfTests
{
    [Theory]
    [InlineData(1, 0, 1)]
    [InlineData(1, 1, 1)]
    [InlineData(8, 4, 1)]
    [InlineData(18, 22, 2)]
    public async Task Receipt_uses_the_thermal_width_and_paginates_long_sales(int itemCount, int paymentCount, int expectedPages)
    {
        var sale = new Sale
        {
            Date = new DateOnly(2026, 11, 26),
            CreatedOn = new DateTime(2026, 11, 26, 13, 45, 0, DateTimeKind.Utc),
            CustomerName = "João de Sá Construções e Serviços da Região de São Raimundo",
            CustomerAddress = "Avenida Principal do Conjunto Residencial, 1325, Bloco B, perto da praça",
            CustomerPhone = "(89) 90000-0000",
            City = "São Raimundo Nonato",
            State = "PI"
        };
        sale.SetNoteNumber(101);
        sale.SetItems(Enum.GetValues<ProductType>().Reverse().Take(itemCount).Select((product, index) => new SaleItem
        {
            Product = product,
            Quantity = index % 2 == 0 ? 0.999m : 12.75m,
            UnitPrice = 1250.75m
        }));
        sale.ApplyDiscount(50m);
        for (var index = 0; index < paymentCount; index++)
        {
            sale.AddPayment(new SalePayment
            {
                PaymentMethod = PaymentMethod.DébitoAutomático,
                PaymentDate = sale.Date.AddDays(index),
                Amount = 42.30m
            });
        }

        var context = new Mock<DbContext>();
        context.Setup(db => db.Set<Sale>()).ReturnsDbSet(new[] { sale });
        var repository = new Mock<ISalesRepository>();
        repository.Setup(repo => repo.QueryAllWithIncludes(false)).Returns(context.Object.Set<Sale>());
        var handler = new GetSaleReceiptPdfHandler(repository.Object);
        var pdf = await handler.Handle(new GetSaleReceiptPdfQuery(sale.Id), CancellationToken.None);

        using var stream = new MemoryStream(pdf);
        using var document = PdfReader.Open(stream, PdfDocumentOpenMode.ReadOnly);
        Assert.Equal(expectedPages, document.PageCount);
        for (var index = 0; index < document.PageCount; index++)
            Assert.Equal(72.1, document.Pages[index].Width.Millimeter, precision: 1);
    }
}
