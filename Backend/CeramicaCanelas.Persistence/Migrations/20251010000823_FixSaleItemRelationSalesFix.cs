using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixSaleItemRelationSalesFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "PaymentDate",
                table: "SalePayments",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date");

            migrationBuilder.AddColumn<int>(
                name: "Break",
                table: "SaleItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Break",
                table: "SaleItems");

            migrationBuilder.AlterColumn<DateTime>(
                name: "PaymentDate",
                table: "SalePayments",
                type: "date",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);
        }
    }
}
