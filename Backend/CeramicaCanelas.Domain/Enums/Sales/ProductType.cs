using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Domain.Enums.Sales
{
    public enum ProductType
    {
        [Display(Name = "Tijolos de 1ª 06 Furos")]
        Brick1_6 = 0,

        [Display(Name = "Tijolos de 2ª 06 Furos")]
        Brick2_6 = 1,

        [Display(Name = "Tijolos de 1ª 08 Furos")]
        Brick1_8 = 2,

        [Display(Name = "Tijolos de 2ª 08 Furos")]
        Brick2_8 = 3,

        [Display(Name = "Tijolos de 08 Furos G")]
        Brick8G = 4,

        [Display(Name = "Blocos de 9 Furos")]
            Block9 = 5,

        [Display(Name = "Blocos de 9 Furos Duplo")]
            Block9Double = 6,

        [Display(Name = "Bandas")]
        Bands = 7,

        [Display(Name = "Telhas de 1ª")]
        RoofTile1 = 8,

        [Display(Name = "Telhas de 2ª")]
        RoofTile2 = 9,

        [Display(Name = "Lajotas")]
        Slabs = 10,

        [Display(Name = "Tijolos para churrasqueira")]
        GrillBricks = 11
    }
}
