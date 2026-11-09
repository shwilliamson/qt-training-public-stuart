using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeighborhoodPizza.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLineInstructions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Instructions",
                table: "OrderLine",
                type: "TEXT",
                maxLength: 140,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Instructions",
                table: "OrderLine");
        }
    }
}
