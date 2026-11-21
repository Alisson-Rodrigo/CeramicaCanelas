using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CentralizePaymentAbsencesAndClosings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ContractorAbsenceDailyValue",
                table: "PaymentRuleConfigurations",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ContractorDsrValue",
                table: "PaymentRuleConfigurations",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HalfAbsenceGeneratesDsr",
                table: "PaymentRuleConfigurations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "AdmissionDate",
                table: "PaymentPeople",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ContractualDsrAuthorized",
                table: "PaymentPeople",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyBonus",
                table: "PaymentPeople",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "Revision",
                table: "PaymentPeople",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Revision",
                table: "PaymentCalculations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "AbsenceId",
                table: "PaymentCalculationItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DsrWeekStart",
                table: "PaymentCalculationItems",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PaymentAbsences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmploymentType = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    IsHalf = table.Column<bool>(type: "boolean", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    Observation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    RecordedBy = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentAbsences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentAbsences_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PaymentAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentCalculationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentAdjustments_PaymentCalculations_PaymentCalculationId",
                        column: x => x.PaymentCalculationId,
                        principalTable: "PaymentCalculations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PaymentAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "text", nullable: false),
                    Before = table.Column<string>(type: "text", nullable: false),
                    After = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentAudits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentAudits_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PaymentDsrCharges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentCalculationId = table.Column<Guid>(type: "uuid", nullable: false),
                    WeekStart = table.Column<DateOnly>(type: "date", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AbsenceIds = table.Column<string>(type: "text", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentDsrCharges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentDsrCharges_PaymentCalculations_PaymentCalculationId",
                        column: x => x.PaymentCalculationId,
                        principalTable: "PaymentCalculations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PaymentDsrCharges_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PaymentPreparations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Fortnight = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestJson = table.Column<string>(type: "text", nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentPreparations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentPreparations_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "PaymentRuleConfigurations",
                keyColumn: "Id",
                keyValue: new Guid("6d118ff0-cdc6-49cc-a862-e46e4d30c3e0"),
                columns: new[] { "ContractorAbsenceDailyValue", "ContractorDsrValue", "HalfAbsenceGeneratesDsr" },
                values: new object[] { null, null, false });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAbsences_PaymentPersonId_Date",
                table: "PaymentAbsences",
                columns: new[] { "PaymentPersonId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAdjustments_PaymentCalculationId_Reference",
                table: "PaymentAdjustments",
                columns: new[] { "PaymentCalculationId", "Reference" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentAudits_PaymentPersonId_CreatedOn",
                table: "PaymentAudits",
                columns: new[] { "PaymentPersonId", "CreatedOn" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDsrCharges_PaymentCalculationId",
                table: "PaymentDsrCharges",
                column: "PaymentCalculationId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDsrCharges_PaymentPersonId_WeekStart",
                table: "PaymentDsrCharges",
                columns: new[] { "PaymentPersonId", "WeekStart" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentPreparations_PaymentPersonId_Year_Month_Fortnight",
                table: "PaymentPreparations",
                columns: new[] { "PaymentPersonId", "Year", "Month", "Fortnight" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentAbsences");

            migrationBuilder.DropTable(
                name: "PaymentAdjustments");

            migrationBuilder.DropTable(
                name: "PaymentAudits");

            migrationBuilder.DropTable(
                name: "PaymentDsrCharges");

            migrationBuilder.DropTable(
                name: "PaymentPreparations");

            migrationBuilder.DropColumn(
                name: "ContractorAbsenceDailyValue",
                table: "PaymentRuleConfigurations");

            migrationBuilder.DropColumn(
                name: "ContractorDsrValue",
                table: "PaymentRuleConfigurations");

            migrationBuilder.DropColumn(
                name: "HalfAbsenceGeneratesDsr",
                table: "PaymentRuleConfigurations");

            migrationBuilder.DropColumn(
                name: "AdmissionDate",
                table: "PaymentPeople");

            migrationBuilder.DropColumn(
                name: "ContractualDsrAuthorized",
                table: "PaymentPeople");

            migrationBuilder.DropColumn(
                name: "MonthlyBonus",
                table: "PaymentPeople");

            migrationBuilder.DropColumn(
                name: "Revision",
                table: "PaymentPeople");

            migrationBuilder.DropColumn(
                name: "Revision",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "AbsenceId",
                table: "PaymentCalculationItems");

            migrationBuilder.DropColumn(
                name: "DsrWeekStart",
                table: "PaymentCalculationItems");

            migrationBuilder.AlterColumn<string>(
                name: "LoginProvider",
                table: "AspNetUserLogins",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
