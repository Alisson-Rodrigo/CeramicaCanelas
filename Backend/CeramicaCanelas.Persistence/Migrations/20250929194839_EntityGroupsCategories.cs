using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EntityGroupsCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "LaunchCategories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "LaunchCategories",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<Guid>(
                name: "GroupId",
                table: "LaunchCategories",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LaunchCategoryGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "uuid_generate_v4()"),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LaunchCategoryGroups", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LaunchCategories_GroupId",
                table: "LaunchCategories",
                column: "GroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_LaunchCategories_LaunchCategoryGroups_GroupId",
                table: "LaunchCategories",
                column: "GroupId",
                principalTable: "LaunchCategoryGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LaunchCategories_LaunchCategoryGroups_GroupId",
                table: "LaunchCategories");

            migrationBuilder.DropTable(
                name: "LaunchCategoryGroups");

            migrationBuilder.DropIndex(
                name: "IX_LaunchCategories_GroupId",
                table: "LaunchCategories");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "LaunchCategories");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "LaunchCategories",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "LaunchCategories",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }
    }
}
