using System.ComponentModel;

public enum ProductType
{
    // 🔹 Tijolos
    [Description("Tijolos de 1ª 06 Furos")]
    Brick1_6 = 0,

    [Description("Tijolos de 2ª 06 Furos")]
    Brick2_6 = 1,

    [Description("Tijolos de 1ª 08 Furos")]
    Brick1_8 = 2,

    [Description("Tijolos de 2ª 08 Furos")]
    Brick2_8 = 3,

    [Description("Tijolos de 08 Furos G")]
    Brick8G = 4,

    [Description("Tijolo de 6 furos Duplo")]
    Brick6Double = 5,

    // 🔹 Blocos
    [Description("Blocos de 9 Furos")]
    Block9 = 6,

    [Description("Blocos de 9 Furos Duplo")]
    Block9Double = 7,

    // 🔹 Bandas
    [Description("Bandas 6 furos")]
    Bands6 = 8,

    [Description("Bandas 8 furos")]
    Bands8 = 9,

    [Description("Bandas 9 furos")]
    Bands9 = 10,

    // 🔹 Telhas
    [Description("Telhas de 1ª")]
    RoofTile1 = 11,

    [Description("Telhas de 2ª")]
    RoofTile2 = 12,

    // 🔹 Lajotas
    [Description("Lajotas")]
    Slabs = 13,

    // 🔹 Especiais
    [Description("Tijolos para churrasqueira")]
    GrillBricks = 14,

    // 🔹 Caldeado
    [Description("Caldeado 6 furos")]
    Caldeado6 = 15,

    [Description("Caldeado 8 furos")]
    Caldeado8 = 16,

    [Description("Caldeado 9 furos")]
    Caldeado9 = 17
}
