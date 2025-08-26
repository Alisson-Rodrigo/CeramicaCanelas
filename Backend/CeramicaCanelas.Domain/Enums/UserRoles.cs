using System.ComponentModel;

namespace CeramicaCanelas.Domain.Enums;
public enum UserRoles {
    [Description("Admin")]
    Admin = 0,
    [Description("Viewer")]
    Viewer = 1,
    [Description("Financial")]
    Financial = 2,
    [Description("Almoxarifado")]
    Almoxarifado = 3,
    [Description("Sales")]
    Sales = 4

}
