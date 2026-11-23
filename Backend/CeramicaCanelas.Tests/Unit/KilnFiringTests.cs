using CeramicaCanelas.Domain.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using CeramicaCanelas.WebApi.Controllers;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace CeramicaCanelas.Tests.Unit;

public sealed class KilnFiringTests
{
    [Fact]
    public void Duration_spans_midnight_and_classifies_exactly_27_hours_as_within_limit()
    {
        var firing = NewFiring("2026-11-21T20:00:00Z", "2026-11-22T23:00:00Z");
        firing.Duration.Should().Be(TimeSpan.FromHours(27));
        firing.DurationClass.Should().Be("Dentro do tempo");
    }

    [Fact]
    public void Duration_over_27_hours_is_classified_as_above_limit()
    {
        var firing = NewFiring("2026-11-20T08:30:00Z", "2026-11-21T11:31:00Z");
        firing.Duration.Should().Be(TimeSpan.FromHours(27) + TimeSpan.FromMinutes(1));
        firing.DurationClass.Should().Be("Acima do tempo");
    }

    [Fact]
    public void Quality_conference_remains_pending_until_each_product_reconciles_or_is_justified()
    {
        var firing = new KilnFiring();
        firing.Products.Add(new KilnFiringProduct { ProductType = ProductType.Brick1_6, Quantity = 100 });
        firing.Products.Add(new KilnFiringProduct { ProductType = ProductType.Brick1_8, Quantity = 80 });
        firing.Quality.Add(new KilnFiringQuality { ProductType = ProductType.Brick1_6, Quantity = 100 });
        firing.Quality.Add(new KilnFiringQuality { ProductType = ProductType.Brick1_8, Quantity = 79 });
        firing.LoadedTotal.Should().Be(180);
        firing.ClassifiedTotal.Should().Be(179);
        firing.ConferenceStatus.Should().Be("Pendente");

        firing.DifferenceJustification = "Uma peça quebrada durante a abertura";
        firing.ConferenceStatus.Should().Be("Conferido");
    }

    [Fact]
    public void Kiln_endpoints_require_an_operational_or_administrator_role()
    {
        var authorization = typeof(KilnFiringsController).GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>().Single();
        authorization.Roles.Should().Be("Admin,Almoxarifado");
    }

    [Fact]
    public void Kiln_catalog_groups_sales_quality_variants_without_changing_the_sales_enum()
    {
        KilnProductCatalog.Canonicalize(ProductType.Brick2_6).Should().Be(ProductType.Brick1_6);
        KilnProductCatalog.Canonicalize(ProductType.Brick2_8).Should().Be(ProductType.Brick1_8);
        KilnProductCatalog.Canonicalize(ProductType.RoofTile2).Should().Be(ProductType.RoofTile1);
        KilnProductCatalog.Canonicalize(ProductType.Caldeado6).Should().Be(ProductType.Brick1_6);
        KilnProductCatalog.Canonicalize(ProductType.Caldeado9).Should().Be(ProductType.Block9);

        var options = KilnProductCatalog.Options().Select(x => x.GetType().GetProperty("Name")!.GetValue(x)!.ToString()).ToArray();
        options.Should().Contain("Tijolos 06 furos").And.Contain("Tijolos 08 furos").And.Contain("Lajotas").And.Contain("Blocos de 9 Furos");
        options.Should().NotContain("Tijolos de 2ª 06 Furos").And.NotContain("Tijolos de 2ª 08 Furos");
        options.Should().NotContain("Caldeado 6 furos").And.NotContain("Caldeado 8 furos").And.NotContain("Caldeado 9 furos");
    }

    [Fact]
    public void Firing_totals_support_multiple_unfixed_product_types()
    {
        var firing = new KilnFiring();
        firing.Products.Add(new KilnFiringProduct { ProductType = ProductType.Slabs, ProductNameSnapshot = "Lajotas", Quantity = 45 });
        firing.Products.Add(new KilnFiringProduct { ProductType = ProductType.Block9, ProductNameSnapshot = "Blocos 9 furos", Quantity = 120 });
        firing.LoadedTotal.Should().Be(165);
    }

    [Fact]
    public void Quality_can_only_be_classified_after_the_firing_end_time()
    {
        var firing = NewFiring("2026-11-22T08:00:00Z", "2026-11-22T20:00:00Z");
        firing.IsFinishedAt(DateTime.Parse("2026-11-22T19:59:59Z")).Should().BeFalse();
        firing.IsFinishedAt(DateTime.Parse("2026-11-22T20:00:00Z")).Should().BeTrue();
    }

    [Fact]
    public void Cancellation_contract_receives_a_json_object_with_reason()
    {
        var input = JsonSerializer.Deserialize<KilnFiringsController.CancelFiringInput>("{\"reason\":\"Registro duplicado\"}", new JsonSerializerOptions(JsonSerializerDefaults.Web));
        input!.Reason.Should().Be("Registro duplicado");
        var parameter = typeof(KilnFiringsController).GetMethod(nameof(KilnFiringsController.Cancel))!.GetParameters()[1];
        parameter.ParameterType.Should().Be(typeof(KilnFiringsController.CancelFiringInput));
        parameter.GetCustomAttributes(typeof(FromBodyAttribute), true).Should().ContainSingle();
    }

    private static KilnFiring NewFiring(string start, string end) => new()
    {
        StartedAtUtc = DateTime.Parse(start, null, System.Globalization.DateTimeStyles.AdjustToUniversal),
        FinishedAtUtc = DateTime.Parse(end, null, System.Globalization.DateTimeStyles.AdjustToUniversal)
    };
}
