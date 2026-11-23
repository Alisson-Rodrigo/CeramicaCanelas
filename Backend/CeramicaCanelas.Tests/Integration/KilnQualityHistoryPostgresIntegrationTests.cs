using System.Security.Claims;
using CeramicaCanelas.Application.Contracts.Application.Services;
using CeramicaCanelas.Domain.Entities;
using CeramicaCanelas.Domain.Enums;
using CeramicaCanelas.Persistence;
using CeramicaCanelas.WebApi.Auditing;
using CeramicaCanelas.WebApi.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace CeramicaCanelas.Tests.Integration;

public sealed class RequiresKilnPostgresFactAttribute : FactAttribute
{
    public RequiresKilnPostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES")))
            Skip = "Defina AUDIT_TEST_POSTGRES para apontar para uma cópia PostgreSQL descartável.";
    }
}

[Collection("Audit PostgreSQL")]
public sealed class KilnQualityHistoryPostgresIntegrationTests
{
    [RequiresKilnPostgresFact]
    public async Task Quality_edits_keep_prior_snapshots_and_justification_does_not_reconcile()
    {
        var connection = Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES")!;
        var options = new DbContextOptionsBuilder<DefaultContext>().UseNpgsql(connection).Options;
        var category = new KilnQualityCategory { Name = $"IT-{Guid.NewGuid():N}", IsActive = true, SortOrder = 99 };
        var firing = new KilnFiring
        {
            KilnName = $"IT-{Guid.NewGuid():N}",
            RegisteredByUserId = "integration-user",
            RegisteredByName = "Usuário de integração",
            StartedAtUtc = DateTime.UtcNow.AddHours(-4),
            FinishedAtUtc = DateTime.UtcNow.AddHours(-1)
        };
        firing.Products.Add(new KilnFiringProduct
        {
            ProductType = ProductType.Slabs,
            ProductNameSnapshot = "Lajotas de integração",
            Quantity = 100
        });

        await using (var seed = new DefaultContext(options))
        {
            await seed.KilnQualityCategories.AddAsync(category);
            firing.Quality.Add(new KilnFiringQuality
            {
                ProductType = ProductType.Slabs,
                Category = category,
                CategoryNameSnapshot = category.Name,
                Quantity = 100
            });
            var original = new KilnFiringQualityRevision
            {
                Firing = firing,
                RevisionNumber = 1,
                ConferencedByUserId = "legacy-user",
                ConferencedByName = "Conferente inicial",
                ConferencedAtUtc = DateTime.UtcNow.AddMinutes(-30),
                State = "Conferido",
                LoadedTotal = 100,
                ClassifiedTotal = 100,
                UnclassifiedTotal = 0
            };
            original.Items.Add(new KilnFiringQualityRevisionItem
            {
                ProductType = ProductType.Slabs,
                ProductNameSnapshot = "Lajotas de integração",
                CategoryId = category.Id,
                CategoryNameSnapshot = category.Name,
                Quantity = 100
            });
            firing.QualityRevisions.Add(original);
            seed.KilnFirings.Add(firing);
            await seed.SaveChangesAsync();
        }

        var audit = new Mock<IAuditEventWriter>();
        audit.Setup(x => x.WriteAsync(It.IsAny<AuditEventData>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var pending = (OkObjectResult)await UpdateQualityInRequest(options, audit.Object, firing.Id,
            new KilnFiringsController.QualityUpdateInput(
                new[] { new KilnFiringsController.QualityInput(ProductType.Slabs, category.Id, 90) },
                "Diferença explicada no teste; não é categoria de perda aprovada.", "Primeira revisão de teste."));
        pending.Value!.GetType().GetProperty("status")!.GetValue(pending.Value).Should().Be("Pendente");

        var reconciled = (OkObjectResult)await UpdateQualityInRequest(options, audit.Object, firing.Id,
            new KilnFiringsController.QualityUpdateInput(
                new[] { new KilnFiringsController.QualityInput(ProductType.Slabs, category.Id, 100) },
                null, "Segunda revisão de teste."));
        reconciled.Value!.GetType().GetProperty("status")!.GetValue(reconciled.Value).Should().Be("Conferido");

        await using var verify = new DefaultContext(options);
        var revisions = await verify.KilnFiringQualityRevisions.AsNoTracking().Include(x => x.Items)
            .Where(x => x.FiringId == firing.Id).OrderBy(x => x.RevisionNumber).ToListAsync();
        revisions.Should().HaveCount(3);
        revisions.Select(x => x.RevisionNumber).Should().Equal(1, 2, 3);
        revisions[0].Items.Single().Quantity.Should().Be(100);
        revisions[1].Items.Single().Quantity.Should().Be(90);
        revisions[1].State.Should().Be("Pendente");
        revisions[1].DifferenceJustification.Should().Contain("Diferença explicada");
        revisions[2].Items.Single().Quantity.Should().Be(100);
        revisions[2].State.Should().Be("Conferido");
        (await verify.KilnFiringQualities.Where(x => x.FiringId == firing.Id).SumAsync(x => x.Quantity)).Should().Be(100);
    }

    private static async Task<IActionResult> UpdateQualityInRequest(
        DbContextOptions<DefaultContext> options,
        IAuditEventWriter audit,
        Guid firingId,
        KilnFiringsController.QualityUpdateInput input)
    {
        await using var requestDb = new DefaultContext(options);
        var controller = new KilnFiringsController(requestDb, audit,
            Mock.Of<IPdfReportService>(), Mock.Of<ISpreadsheetReportService>(), Mock.Of<IWebHostEnvironment>());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "integration-user"),
                    new Claim(ClaimTypes.Name, "Usuário de integração")
                }, "integration"))
            }
        };
        return await controller.UpdateQuality(firingId, input, default);
    }
}
