﻿using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Movimentacoes_ES.Entradas.Command.DeleteMovEntradasProductsCommand
{
    public class DeleteMovEntradasProductsCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
    }
}
