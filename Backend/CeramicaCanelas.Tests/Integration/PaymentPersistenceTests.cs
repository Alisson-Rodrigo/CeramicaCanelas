using CeramicaCanelas.Domain.Entities.Payments;
using CeramicaCanelas.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
namespace CeramicaCanelas.Tests.Integration;
public sealed class PaymentPersistenceTests
{
    private static DefaultContext Context() => new(new DbContextOptionsBuilder<DefaultContext>().UseNpgsql("Host=localhost;Database=model_only;Username=model;Password=model").Options);
    [Fact]
    public void NewMigrationAddsOnlyPaymentObjectsAndPreservesHistoricalRows()
    {
        using var context = Context();
        var sql = context.GetService<IMigrator>().GenerateScript("20260825110449_RemovePaymentPersonBonusValue", "20261114114955_CentralizePaymentAbsencesAndClosings");
        sql.Should().Contain("CREATE TABLE \"PaymentAbsences\"").And.Contain("CREATE UNIQUE INDEX \"IX_PaymentDsrCharges_PaymentPersonId_WeekStart\"");
        sql.Should().NotContain("DROP TABLE").And.NotContain("DROP COLUMN").And.NotContain("AspNetUser");
    }
    [Fact]
    public void AuditMigrationAddsOnlyNewTablesAndIndexes()
    {
        using var context = Context();
        var sql = context.GetService<IMigrator>().GenerateScript("20261114114955_CentralizePaymentAbsencesAndClosings", "20261122174554_AddCentralAuditAndNotifications");
        sql.Should().Contain("CREATE TABLE \"SystemAuditEvents\"")
            .And.Contain("CREATE TABLE \"AdminNotifications\"")
            .And.Contain("IX_SystemAuditEvents_OccurredAtUtc")
            .And.Contain("IX_AdminNotifications_RecipientUserId_ReadAtUtc_CreatedOn")
            .And.NotContain("DROP TABLE").And.NotContain("DROP COLUMN");
    }
    [Fact]
    public void SnapshotMatchesCurrentModel()
    {
        using var context = Context();
        var snapshot = context.GetService<IMigrationsAssembly>().ModelSnapshot!.Model;
        var initialized = context.GetService<IModelRuntimeInitializer>().Initialize(snapshot, designTime: true);
        var current = context.GetService<IDesignTimeModel>().Model;
        context.GetService<IMigrationsModelDiffer>().GetDifferences(initialized.GetRelationalModel(), current.GetRelationalModel()).Should().BeEmpty();
    }
    [Theory]
    [InlineData(typeof(PaymentAbsence))]
    [InlineData(typeof(PaymentDsrCharge))]
    [InlineData(typeof(PaymentCalculation))]
    [InlineData(typeof(PaymentAdjustment))]
    public void FinancialDuplicatesHaveDatabaseUniqueConstraints(Type entity)
    {
        using var context = Context(); context.Model.FindEntityType(entity)!.GetIndexes().Should().Contain(x => x.IsUnique);
    }
    [Theory]
    [InlineData(typeof(PaymentPerson))]
    [InlineData(typeof(PaymentAbsence))]
    [InlineData(typeof(PaymentCalculation))]
    [InlineData(typeof(PaymentAdjustment))]
    public void ConcurrentWritesUseRevisionTokens(Type entity)
    {
        using var context = Context(); context.Model.FindEntityType(entity)!.FindProperty("Revision")!.IsConcurrencyToken.Should().BeTrue();
    }
}
