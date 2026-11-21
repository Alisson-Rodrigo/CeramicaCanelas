using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RebuildPaymentsModuleV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Authorized reset of the removed payment module. No tables from other
            // application areas are touched here.
            migrationBuilder.Sql(
                """
                DROP TABLE IF EXISTS "PaymentCalculationItems" CASCADE;
                DROP TABLE IF EXISTS "PaymentCalculations" CASCADE;
                DROP TABLE IF EXISTS "PaymentVoucherCompetences" CASCADE;
                DROP TABLE IF EXISTS "PaymentVouchers" CASCADE;
                DROP TABLE IF EXISTS "VoucherCompetences" CASCADE;
                DROP TABLE IF EXISTS "Vouchers" CASCADE;
                DROP TABLE IF EXISTS "PaymentBonusValues" CASCADE;
                DROP TABLE IF EXISTS "PaymentBaseValues" CASCADE;
                DROP TABLE IF EXISTS "PaymentRuleConfigurations" CASCADE;
                DROP TABLE IF EXISTS "PaymentPeople" CASCADE;
                """);

            migrationBuilder.CreateTable(
                name: "PaymentPeople",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EmploymentType = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentPeople", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentPeople_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PaymentRuleConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EmployeeFirstFortnightPercent = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    ContractorFirstFortnightPercent = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    FullAbsenceValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    HalfAbsenceValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MonthlyWorkMinutes = table.Column<int>(type: "integer", nullable: true),
                    PositiveHourMultiplier = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: true),
                    NegativeHourMultiplier = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: true),
                    NightHourMultiplier = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentRuleConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentBaseValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    MonthlyValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                    Value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "PaymentVouchers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TotalValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    InstallmentValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RemainingBalance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartYear = table.Column<int>(type: "integer", nullable: false),
                    StartMonth = table.Column<int>(type: "integer", nullable: false),
                    Periodicity = table.Column<int>(type: "integer", nullable: false),
                    IntervalMonths = table.Column<int>(type: "integer", nullable: false),
                    InstallmentCount = table.Column<int>(type: "integer", nullable: true),
                    AppliedInstallments = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentVouchers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentVouchers_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentCalculations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentRuleConfigurationId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EmploymentType = table.Column<int>(type: "integer", nullable: false),
                    CompetenceYear = table.Column<int>(type: "integer", nullable: false),
                    CompetenceMonth = table.Column<int>(type: "integer", nullable: false),
                    Fortnight = table.Column<int>(type: "integer", nullable: false),
                    BaseValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FortnightPercent = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    FirstFortnightPaid = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    GrossValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AdditionValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DeductionValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FirstFortnightValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SecondFortnightValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MonthlyTotalValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentCalculations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentCalculations_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentCalculations_PaymentRuleConfigurations_PaymentRuleCo~",
                        column: x => x.PaymentRuleConfigurationId,
                        principalTable: "PaymentRuleConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PaymentVoucherCompetences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VoucherId = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Skip = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentVoucherCompetences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentVoucherCompetences_PaymentVouchers_VoucherId",
                        column: x => x.VoucherId,
                        principalTable: "PaymentVouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentCalculationItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentCalculationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    QuantityMinutes = table.Column<int>(type: "integer", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    VoucherId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentCalculationItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentCalculationItems_PaymentCalculations_PaymentCalculat~",
                        column: x => x.PaymentCalculationId,
                        principalTable: "PaymentCalculations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "PaymentRuleConfigurations",
                columns: new[] { "Id", "ContractorFirstFortnightPercent", "CreatedOn", "EffectiveFrom", "EmployeeFirstFortnightPercent", "FullAbsenceValue", "HalfAbsenceValue", "ModifiedOn", "MonthlyWorkMinutes", "NegativeHourMultiplier", "NightHourMultiplier", "PositiveHourMultiplier" },
                values: new object[] { new Guid("6d118ff0-cdc6-49cc-a862-e46e4d30c3e0"), 50m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new DateOnly(2000, 1, 1), 40m, 100m, 50m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, null });

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

            migrationBuilder.CreateIndex(
                name: "IX_PaymentCalculationItems_PaymentCalculationId",
                table: "PaymentCalculationItems",
                column: "PaymentCalculationId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentCalculations_PaymentPersonId_CompetenceYear_Competen~",
                table: "PaymentCalculations",
                columns: new[] { "PaymentPersonId", "CompetenceYear", "CompetenceMonth", "Fortnight" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentCalculations_PaymentRuleConfigurationId",
                table: "PaymentCalculations",
                column: "PaymentRuleConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople",
                column: "EmployeeId",
                unique: true,
                filter: "\"EmployeeId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRuleConfigurations_EffectiveFrom",
                table: "PaymentRuleConfigurations",
                column: "EffectiveFrom",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentVoucherCompetences_VoucherId_Year_Month",
                table: "PaymentVoucherCompetences",
                columns: new[] { "VoucherId", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentVouchers_PaymentPersonId",
                table: "PaymentVouchers",
                column: "PaymentPersonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentBaseValues");

            migrationBuilder.DropTable(
                name: "PaymentBonusValues");

            migrationBuilder.DropTable(
                name: "PaymentCalculationItems");

            migrationBuilder.DropTable(
                name: "PaymentVoucherCompetences");

            migrationBuilder.DropTable(
                name: "PaymentCalculations");

            migrationBuilder.DropTable(
                name: "PaymentVouchers");

            migrationBuilder.DropTable(
                name: "PaymentRuleConfigurations");

            migrationBuilder.DropTable(
                name: "PaymentPeople");
        }
    }
}
