using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddKilnFiringQualityHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QualityConferenceObservations",
                table: "KilnFirings",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QualityConferenceState",
                table: "KilnFirings",
                type: "character varying(24)",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QualityConferencedAtUtc",
                table: "KilnFirings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QualityConferencedByName",
                table: "KilnFirings",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QualityConferencedByUserId",
                table: "KilnFirings",
                type: "character varying(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "KilnFiringQualityRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FiringId = table.Column<Guid>(type: "uuid", nullable: false),
                    RevisionNumber = table.Column<int>(type: "integer", nullable: false),
                    ConferencedByUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: true),
                    ConferencedByName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    ConferencedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Observations = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DifferenceJustification = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    State = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    LoadedTotal = table.Column<int>(type: "integer", nullable: false),
                    ClassifiedTotal = table.Column<int>(type: "integer", nullable: false),
                    UnclassifiedTotal = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KilnFiringQualityRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KilnFiringQualityRevisions_KilnFirings_FiringId",
                        column: x => x.FiringId,
                        principalTable: "KilnFirings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KilnFiringQualityRevisionItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RevisionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductType = table.Column<int>(type: "integer", nullable: false),
                    ProductNameSnapshot = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryNameSnapshot = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KilnFiringQualityRevisionItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KilnFiringQualityRevisionItems_KilnFiringQualityRevisions_R~",
                        column: x => x.RevisionId,
                        principalTable: "KilnFiringQualityRevisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_KilnFiringQualityRevisionItems_KilnQualityCategories_Catego~",
                        column: x => x.CategoryId,
                        principalTable: "KilnQualityCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KilnFiringQualityRevisionItems_CategoryId",
                table: "KilnFiringQualityRevisionItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_KilnFiringQualityRevisionItems_RevisionId_ProductType_Categ~",
                table: "KilnFiringQualityRevisionItems",
                columns: new[] { "RevisionId", "ProductType", "CategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KilnFiringQualityRevisions_FiringId_RevisionNumber",
                table: "KilnFiringQualityRevisions",
                columns: new[] { "FiringId", "RevisionNumber" },
                unique: true);

            // Backfill the quality currently attached to each firing as revision 1. Legacy actor
            // identity is unavailable, so it stays null; no business rows are changed or removed.
            migrationBuilder.Sql("""
                WITH by_product AS (
                    SELECT f."Id" AS "FiringId", p."ProductType", p."ProductNameSnapshot",
                           p."Quantity" AS "Loaded", COALESCE(SUM(q."Quantity"), 0)::integer AS "Classified"
                    FROM "KilnFirings" f
                    JOIN "KilnFiringProducts" p ON p."FiringId" = f."Id"
                    LEFT JOIN "KilnFiringQualities" q ON q."FiringId" = f."Id" AND q."ProductType" = p."ProductType"
                    GROUP BY f."Id", p."ProductType", p."ProductNameSnapshot", p."Quantity"
                ), summaries AS (
                    SELECT "FiringId", SUM("Loaded")::integer AS "LoadedTotal",
                           SUM("Classified")::integer AS "ClassifiedTotal",
                           GREATEST(0, SUM("Loaded") - SUM("Classified"))::integer AS "UnclassifiedTotal",
                           BOOL_AND("Loaded" = "Classified") AS "Reconciled"
                    FROM by_product GROUP BY "FiringId"
                )
                INSERT INTO "KilnFiringQualityRevisions"
                    ("Id", "FiringId", "RevisionNumber", "ConferencedAtUtc", "DifferenceJustification", "State",
                     "LoadedTotal", "ClassifiedTotal", "UnclassifiedTotal", "CreatedOn", "ModifiedOn")
                SELECT uuid_generate_v4(), s."FiringId", 1, NULL, f."DifferenceJustification",
                       CASE WHEN s."Reconciled" THEN 'Conferido' ELSE 'Pendente' END,
                       s."LoadedTotal", s."ClassifiedTotal", s."UnclassifiedTotal",
                       f."CreatedOn", f."ModifiedOn"
                FROM summaries s JOIN "KilnFirings" f ON f."Id" = s."FiringId"
                WHERE EXISTS (SELECT 1 FROM "KilnFiringQualities" q WHERE q."FiringId" = s."FiringId");

                INSERT INTO "KilnFiringQualityRevisionItems"
                    ("Id", "RevisionId", "ProductType", "ProductNameSnapshot", "CategoryId", "CategoryNameSnapshot", "Quantity", "CreatedOn", "ModifiedOn")
                SELECT uuid_generate_v4(), r."Id", q."ProductType", p."ProductNameSnapshot", q."CategoryId",
                       q."CategoryNameSnapshot", q."Quantity", q."CreatedOn", q."ModifiedOn"
                FROM "KilnFiringQualityRevisions" r
                JOIN "KilnFiringQualities" q ON q."FiringId" = r."FiringId"
                JOIN "KilnFiringProducts" p ON p."FiringId" = q."FiringId" AND p."ProductType" = q."ProductType"
                WHERE r."RevisionNumber" = 1;

                UPDATE "KilnFirings" f SET
                    "QualityConferenceState" = r."State",
                    "QualityConferencedAtUtc" = NULL,
                    "QualityConferenceObservations" = NULL
                FROM "KilnFiringQualityRevisions" r
                WHERE r."FiringId" = f."Id" AND r."RevisionNumber" = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KilnFiringQualityRevisionItems");

            migrationBuilder.DropTable(
                name: "KilnFiringQualityRevisions");

            migrationBuilder.DropColumn(
                name: "QualityConferenceObservations",
                table: "KilnFirings");

            migrationBuilder.DropColumn(
                name: "QualityConferenceState",
                table: "KilnFirings");

            migrationBuilder.DropColumn(
                name: "QualityConferencedAtUtc",
                table: "KilnFirings");

            migrationBuilder.DropColumn(
                name: "QualityConferencedByName",
                table: "KilnFirings");

            migrationBuilder.DropColumn(
                name: "QualityConferencedByUserId",
                table: "KilnFirings");
        }
    }
}
