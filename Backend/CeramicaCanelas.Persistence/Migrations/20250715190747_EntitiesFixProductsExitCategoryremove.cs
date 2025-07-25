﻿using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EntitiesFixProductsExitCategoryremove : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductExits_Categories_CategoryId",
                table: "ProductExits");

            migrationBuilder.DropIndex(
                name: "IX_ProductExits_CategoryId",
                table: "ProductExits");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "ProductExits");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "ProductExits",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_ProductExits_CategoryId",
                table: "ProductExits",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductExits_Categories_CategoryId",
                table: "ProductExits",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
