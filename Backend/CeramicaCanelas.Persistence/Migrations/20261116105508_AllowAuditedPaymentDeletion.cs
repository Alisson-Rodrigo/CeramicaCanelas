using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowAuditedPaymentDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDsrCharges_PaymentPersonId_WeekStart",
                table: "PaymentDsrCharges");

            migrationBuilder.DropIndex(
                name: "IX_PaymentCalculations_PaymentPersonId_CompetenceYear_Competen~",
                table: "PaymentCalculations");

            migrationBuilder.AddColumn<int>(
                name: "Revision",
                table: "PaymentVouchers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "PaymentPeople",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsCancelled",
                table: "PaymentDsrCharges",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople",
                column: "EmployeeId",
                unique: true,
                filter: "\"EmployeeId\" IS NOT NULL AND \"IsDeleted\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDsrCharges_PaymentPersonId_WeekStart",
                table: "PaymentDsrCharges",
                columns: new[] { "PaymentPersonId", "WeekStart" },
                unique: true,
                filter: "\"IsCancelled\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentCalculations_PaymentPersonId_CompetenceYear_Competen~",
                table: "PaymentCalculations",
                columns: new[] { "PaymentPersonId", "CompetenceYear", "CompetenceMonth", "Fortnight" },
                unique: true,
                filter: "\"Status\" <> 4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople");

            migrationBuilder.DropIndex(
                name: "IX_PaymentDsrCharges_PaymentPersonId_WeekStart",
                table: "PaymentDsrCharges");

            migrationBuilder.DropIndex(
                name: "IX_PaymentCalculations_PaymentPersonId_CompetenceYear_Competen~",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "Revision",
                table: "PaymentVouchers");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "PaymentPeople");

            migrationBuilder.DropColumn(
                name: "IsCancelled",
                table: "PaymentDsrCharges");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentPeople_EmployeeId",
                table: "PaymentPeople",
                column: "EmployeeId",
                unique: true,
                filter: "\"EmployeeId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentDsrCharges_PaymentPersonId_WeekStart",
                table: "PaymentDsrCharges",
                columns: new[] { "PaymentPersonId", "WeekStart" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentCalculations_PaymentPersonId_CompetenceYear_Competen~",
                table: "PaymentCalculations",
                columns: new[] { "PaymentPersonId", "CompetenceYear", "CompetenceMonth", "Fortnight" },
                unique: true);
        }
    }
}
