using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EmployeeManualPaymentsAndSeparatedReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentPeople_Employees_EmployeeId",
                table: "PaymentPeople");

            migrationBuilder.DropIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople");

            // Preserve old references as an unmapped, non-operational history column; no existing values are erased.
            migrationBuilder.RenameColumn(name: "EmployeeId", table: "PaymentPeople", newName: "LegacyOperationalReference");

            migrationBuilder.AddColumn<int>(
                name: "EmployeePaymentFlowVersion",
                table: "PaymentCalculations",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EmployeeBonusSettlements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentCalculationId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    SourceAbsenceIds = table.Column<string>(type: "text", nullable: false),
                    OriginalValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FullAbsences = table.Column<int>(type: "integer", nullable: false),
                    HalfAbsences = table.Column<int>(type: "integer", nullable: false),
                    FullAbsenceDeduction = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    HalfAbsenceDeduction = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DeductionValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeBonusSettlements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeBonusSettlements_PaymentCalculations_PaymentCalcula~",
                        column: x => x.PaymentCalculationId,
                        principalTable: "PaymentCalculations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EmployeeBonusSettlements_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EmployeeTimeEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    PositiveMinutes = table.Column<int>(type: "integer", nullable: false),
                    NegativeMinutes = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    RecordedBy = table.Column<string>(type: "text", nullable: false),
                    Revision = table.Column<int>(type: "integer", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeTimeEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeTimeEntries_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeBonusSettlements_PaymentCalculationId",
                table: "EmployeeBonusSettlements",
                column: "PaymentCalculationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeBonusSettlements_PaymentPersonId_Year_Month",
                table: "EmployeeBonusSettlements",
                columns: new[] { "PaymentPersonId", "Year", "Month" },
                unique: true,
                filter: "\"IsCancelled\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeTimeEntries_PaymentPersonId_Date",
                table: "EmployeeTimeEntries",
                columns: new[] { "PaymentPersonId", "Date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeeBonusSettlements");

            migrationBuilder.DropTable(
                name: "EmployeeTimeEntries");

            migrationBuilder.DropColumn(
                name: "EmployeePaymentFlowVersion",
                table: "PaymentCalculations");

            migrationBuilder.RenameColumn(name: "LegacyOperationalReference", table: "PaymentPeople", newName: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople",
                column: "EmployeeId",
                unique: true,
                filter: "\"EmployeeId\" IS NOT NULL AND \"IsDeleted\" = FALSE");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentPeople_Employees_EmployeeId",
                table: "PaymentPeople",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
