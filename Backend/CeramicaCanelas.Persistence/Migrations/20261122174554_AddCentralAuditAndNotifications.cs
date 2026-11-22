using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeramicaCanelas.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCentralAuditAndNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SystemAuditEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Action = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Outcome = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Module = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ResourceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ResourceId = table.Column<string>(type: "text", nullable: true),
                    ActorUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: true),
                    ActorDisplayName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    HttpMethod = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Route = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    TraceId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    TechnicalContext = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemAuditEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AuditEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientUserId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Priority = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Message = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Origin = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ReadAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdminNotifications_SystemAuditEvents_AuditEventId",
                        column: x => x.AuditEventId,
                        principalTable: "SystemAuditEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdminNotifications_AuditEventId",
                table: "AdminNotifications",
                column: "AuditEventId");

            migrationBuilder.CreateIndex(
                name: "IX_AdminNotifications_RecipientUserId_ReadAtUtc_CreatedOn",
                table: "AdminNotifications",
                columns: new[] { "RecipientUserId", "ReadAtUtc", "CreatedOn" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditEvents_Action_OccurredAtUtc",
                table: "SystemAuditEvents",
                columns: new[] { "Action", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditEvents_ActorUserId_OccurredAtUtc",
                table: "SystemAuditEvents",
                columns: new[] { "ActorUserId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditEvents_Category_OccurredAtUtc",
                table: "SystemAuditEvents",
                columns: new[] { "Category", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditEvents_Module_OccurredAtUtc",
                table: "SystemAuditEvents",
                columns: new[] { "Module", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemAuditEvents_OccurredAtUtc",
                table: "SystemAuditEvents",
                column: "OccurredAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminNotifications");

            migrationBuilder.DropTable(
                name: "SystemAuditEvents");
        }
    }
}
