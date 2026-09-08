using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyPaymentPersonValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BonusValue",
                table: "PaymentPeople",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyValue",
                table: "PaymentPeople",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql(
                """
                UPDATE "PaymentPeople" AS person
                SET "MonthlyValue" = (
                    SELECT value."MonthlyValue"
                    FROM "PaymentBaseValues" AS value
                    WHERE value."PaymentPersonId" = person."Id"
                    ORDER BY value."EffectiveFrom" DESC, value."CreatedOn" DESC
                    LIMIT 1
                )
                WHERE EXISTS (
                    SELECT 1
                    FROM "PaymentBaseValues" AS value
                    WHERE value."PaymentPersonId" = person."Id"
                );

                UPDATE "PaymentPeople" AS person
                SET "BonusValue" = (
                    SELECT value."Value"
                    FROM "PaymentBonusValues" AS value
                    WHERE value."PaymentPersonId" = person."Id"
                    ORDER BY value."EffectiveFrom" DESC, value."CreatedOn" DESC
                    LIMIT 1
                )
                WHERE EXISTS (
                    SELECT 1
                    FROM "PaymentBonusValues" AS value
                    WHERE value."PaymentPersonId" = person."Id"
                );
                """);

            migrationBuilder.DropTable(
                name: "PaymentBaseValues");

            migrationBuilder.DropTable(
                name: "PaymentBonusValues");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BonusValue",
                table: "PaymentPeople");

            migrationBuilder.DropColumn(
                name: "MonthlyValue",
                table: "PaymentPeople");

            migrationBuilder.CreateTable(
                name: "PaymentBaseValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MonthlyValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentBaseValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentBaseValues_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentBonusValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentBonusValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentBonusValues_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentBaseValues_PaymentPersonId_EffectiveFrom",
                table: "PaymentBaseValues",
                columns: new[] { "PaymentPersonId", "EffectiveFrom" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentBonusValues_PaymentPersonId_EffectiveFrom",
                table: "PaymentBonusValues",
                columns: new[] { "PaymentPersonId", "EffectiveFrom" },
                unique: true);
        }
    }
}
