using CeramicaCanelas.Domain.Abstract;
using System.Collections.Generic;

namespace CeramicaCanelas.Domain.Entities.Financial
{
    /// <summary>
    /// Representa um agrupamento de categorias de lançamento (ex: Setor Pessoal, Contas Operacionais).
    /// </summary>
    public class LaunchCategoryGroup : BaseEntity
    {
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Se 'true', a categoria foi "deletada" e não deve aparecer nas listagens.
        /// </summary>
        public bool IsDeleted { get; set; } = false;

        /// <summary>
        /// Lista de subcategorias associadas a este grupo.
        /// </summary>
        public ICollection<LaunchCategory> Categories { get; set; } = new List<LaunchCategory>();
    }
}
