using CeramicaCanelas.Domain.Abstract;

namespace CeramicaCanelas.Domain.Entities.Financial
{
    public class LaunchCategory : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public bool IsDeleted { get; set; } = false;

        /// <summary>
        /// Chave estrangeira para o grupo de categorias.
        /// </summary>
        public Guid? GroupId { get; set; }

        /// <summary>
        /// Grupo ao qual essa subcategoria pertence.
        /// </summary>
        public LaunchCategoryGroup? Group { get; set; }
    }
}
