using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RefineEmployeeFortnightAndVouchers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowPartialDiscount",
                table: "PaymentVouchers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "EmployeeAccountantAmount",
                table: "PaymentCalculations",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EmployeeAccountantAmountMode",
                table: "PaymentCalculations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployeeAccountantNotes",
                table: "PaymentCalculations",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployeeAccountantReference",
                table: "PaymentCalculations",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EmployeeFirstGrossValue",
                table: "PaymentCalculations",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmployeeFirstPaidAt",
                table: "PaymentCalculations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EmployeeSystemNetValue",
                table: "PaymentCalculations",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EmployeeSystemSalaryValue",
                table: "PaymentCalculations",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReviewed",
                table: "PaymentAbsences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "PaymentAbsences",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedBy",
                table: "PaymentAbsences",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EmployeeAccountantSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Reference = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    SummaryJson = table.Column<string>(type: "text", nullable: false),
                    RecordedBy = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeAccountantSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmployeeAccountantSubmissions_PaymentPeople_PaymentPersonId",
                        column: x => x.PaymentPersonId,
                        principalTable: "PaymentPeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAccountantSubmissions_PaymentPersonId_Year_Month",
                table: "EmployeeAccountantSubmissions",
                columns: new[] { "PaymentPersonId", "Year", "Month" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeeAccountantSubmissions");

            migrationBuilder.DropColumn(
                name: "AllowPartialDiscount",
                table: "PaymentVouchers");

            migrationBuilder.DropColumn(
                name: "EmployeeAccountantAmount",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeAccountantAmountMode",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeAccountantNotes",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeAccountantReference",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeFirstGrossValue",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeFirstPaidAt",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeSystemNetValue",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "EmployeeSystemSalaryValue",
                table: "PaymentCalculations");

            migrationBuilder.DropColumn(
                name: "IsReviewed",
                table: "PaymentAbsences");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "PaymentAbsences");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "PaymentAbsences");
        }
    }
}
