using CeramicaCanelas.Domain.Entities.Financial;


namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.LaunchCategories.Queries
{
    public class LaunchCategoryResult
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public string NameGroupCategory = string.Empty;

        public Guid IdGroupCategory = Guid.Empty;

        public LaunchCategoryResult(LaunchCategory category)
        {
            Id = category.Id;
            Name = category.Name;
            NameGroupCategory = category.Group.Name ?? "Sem categória principal";
            IdGroupCategory = category.Group.Id;
        }
    }
}

