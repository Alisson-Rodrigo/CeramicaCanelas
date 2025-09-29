using CeramicaCanelas.Domain.Entities.Financial;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategories.Queries
{
    public class LaunchCategoryResult
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public string NameGroupCategory { get; set; } = "Sem categoria principal";

        public Guid? IdGroupCategory { get; set; }

        public LaunchCategoryResult(LaunchCategory category)
        {
            Id = category.Id;
            Name = category.Name;
            NameGroupCategory = category.Group?.Name ?? "Sem categoria principal";
            IdGroupCategory = category.Group?.Id;
        }
    }
}
