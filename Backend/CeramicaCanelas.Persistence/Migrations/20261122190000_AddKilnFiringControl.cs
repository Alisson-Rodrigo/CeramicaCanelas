using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations;

public partial class AddKilnFiringControl : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("KilnQualityCategories", table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
            IsActive = table.Column<bool>(type: "boolean", nullable: false),
            SortOrder = table.Column<int>(type: "integer", nullable: false),
            CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_KilnQualityCategories", x => x.Id));

        migrationBuilder.CreateTable("KilnFirings", table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            KilnName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
            StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            FinishedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
            RegisteredByUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
            RegisteredByName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
            DifferenceJustification = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
            IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
            CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_KilnFirings", x => x.Id));

        migrationBuilder.CreateTable("KilnFiringProducts", table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            FiringId = table.Column<Guid>(type: "uuid", nullable: false),
            ProductType = table.Column<int>(type: "integer", nullable: false),
            ProductNameSnapshot = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
            Quantity = table.Column<int>(type: "integer", nullable: false),
            CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
        }, constraints: table =>
        {
            table.PrimaryKey("PK_KilnFiringProducts", x => x.Id);
            table.ForeignKey("FK_KilnFiringProducts_KilnFirings_FiringId", x => x.FiringId, "KilnFirings", "Id", onDelete: ReferentialAction.Restrict);
        });

        migrationBuilder.CreateTable("KilnFiringBurners", table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            FiringId = table.Column<Guid>(type: "uuid", nullable: false),
            EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
            EmployeeNameSnapshot = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
            CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
        }, constraints: table =>
        {
            table.PrimaryKey("PK_KilnFiringBurners", x => x.Id);
            table.ForeignKey("FK_KilnFiringBurners_Employees_EmployeeId", x => x.EmployeeId, "Employees", "Id", onDelete: ReferentialAction.Restrict);
            table.ForeignKey("FK_KilnFiringBurners_KilnFirings_FiringId", x => x.FiringId, "KilnFirings", "Id", onDelete: ReferentialAction.Restrict);
        });

        migrationBuilder.CreateTable("KilnFiringQualities", table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            FiringId = table.Column<Guid>(type: "uuid", nullable: false),
            ProductType = table.Column<int>(type: "integer", nullable: false),
            CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
            CategoryNameSnapshot = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
            Quantity = table.Column<int>(type: "integer", nullable: false),
            CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
        }, constraints: table =>
        {
            table.PrimaryKey("PK_KilnFiringQualities", x => x.Id);
            table.ForeignKey("FK_KilnFiringQualities_KilnFirings_FiringId", x => x.FiringId, "KilnFirings", "Id", onDelete: ReferentialAction.Restrict);
            table.ForeignKey("FK_KilnFiringQualities_KilnQualityCategories_CategoryId", x => x.CategoryId, "KilnQualityCategories", "Id", onDelete: ReferentialAction.Restrict);
        });

        migrationBuilder.CreateIndex("IX_KilnQualityCategories_Name", "KilnQualityCategories", "Name", unique: true);
        migrationBuilder.CreateIndex("IX_KilnFirings_StartedAtUtc", "KilnFirings", "StartedAtUtc");
        migrationBuilder.CreateIndex("IX_KilnFirings_KilnName_StartedAtUtc", "KilnFirings", new[] { "KilnName", "StartedAtUtc" });
        migrationBuilder.CreateIndex("IX_KilnFiringProducts_FiringId", "KilnFiringProducts", "FiringId");
        migrationBuilder.CreateIndex("IX_KilnFiringProducts_ProductType_FiringId", "KilnFiringProducts", new[] { "ProductType", "FiringId" }, unique: true);
        migrationBuilder.CreateIndex("IX_KilnFiringBurners_EmployeeId_FiringId", "KilnFiringBurners", new[] { "EmployeeId", "FiringId" }, unique: true);
        migrationBuilder.CreateIndex("IX_KilnFiringBurners_FiringId", "KilnFiringBurners", "FiringId");
        migrationBuilder.CreateIndex("IX_KilnFiringQualities_CategoryId", "KilnFiringQualities", "CategoryId");
        migrationBuilder.CreateIndex("IX_KilnFiringQualities_FiringId_ProductType_CategoryId", "KilnFiringQualities", new[] { "FiringId", "ProductType", "CategoryId" }, unique: true);

        var now = new DateTime(2026, 11, 22, 0, 0, 0, DateTimeKind.Utc);
        migrationBuilder.InsertData("KilnQualityCategories", new[] { "Id", "Name", "IsActive", "SortOrder", "CreatedOn", "ModifiedOn" }, new object[,]
        {
            { new Guid("d14b63f9-3a57-4637-90ac-e12ce2510001"), "Primeira linha", true, 1, now, now },
            { new Guid("d14b63f9-3a57-4637-90ac-e12ce2510002"), "Segunda linha", true, 2, now, now },
            { new Guid("d14b63f9-3a57-4637-90ac-e12ce2510003"), "Caldeado", true, 3, now, now }
        });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("KilnFiringQualities");
        migrationBuilder.DropTable("KilnFiringBurners");
        migrationBuilder.DropTable("KilnFiringProducts");
        migrationBuilder.DropTable("KilnFirings");
        migrationBuilder.DropTable("KilnQualityCategories");
    }
}
