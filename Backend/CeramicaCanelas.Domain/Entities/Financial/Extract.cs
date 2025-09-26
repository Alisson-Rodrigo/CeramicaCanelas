using CeramicaCanelas.Domain.Abstract;
using CeramicaCanelas.Domain.Enums.Financial;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Domain.Entities.Financial
{
    public class Extract : BaseEntity
    {
        [Required]
        public PaymentMethod PaymentMethod { get; set; }
        [Required]
        [Column(TypeName = "date")] // só a data, sem hora
        public DateOnly Date { get; set; }
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Value { get; set; }
        [MaxLength(255)]
        public string? Observations { get; set; }
        public string OperatorName { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;


    }
}
