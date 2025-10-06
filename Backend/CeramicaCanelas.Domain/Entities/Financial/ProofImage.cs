using CeramicaCanelas.Domain.Abstract;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Domain.Entities.Financial
{
    /// <summary>
    /// Representa um arquivo de comprovante associado a um lançamento financeiro.
    /// </summary>
    public class ProofImage : BaseEntity
    {
        /// <summary>
        /// A URL ou caminho para o arquivo armazenado.
        /// Ex: "https://storage.blob.core.windows.net/comprovantes/arquivo123.jpg"
        /// </summary>
        public string FileUrl { get; set; } = string.Empty;

        /// <summary>
        /// O nome original do arquivo enviado pelo usuário. Ex: "nota-fiscal-cimento.pdf".
        /// </summary>
        public string OriginalFileName { get; set; } = string.Empty;

        /// <summary>
        /// O tipo de conteúdo do arquivo (MIME Type). Ex: "image/jpeg", "application/pdf".
        /// </hsummary>
        public string ContentType { get; set; } = string.Empty;

        /// <summary>
        /// O tamanho do arquivo em bytes.
        /// </summary>
        public long FileSize { get; set; }

        // --- Chave Estrangeira para o Lançamento ---

        /// <summary>
        /// Chave estrangeira (FK) que conecta o comprovante ao seu respectivo lançamento.
        /// </summary>
        public Guid LaunchId { get; set; }

        /// <summary>
        /// Propriedade de navegação para o lançamento pai.
        /// </summary>
        public Launch? Launch { get; set; }
    }
}
