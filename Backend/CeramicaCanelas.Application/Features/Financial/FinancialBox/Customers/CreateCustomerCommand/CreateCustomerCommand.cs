﻿using CeramicaCanelas.Domain.Entities.Financial;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CeramicaCanelas.Application.Features.Financial.FinancialBox.Customers.CreateCustomerCommand
{
    public class CreateCustomerCommand : IRequest<Unit>
    {
        public string Name { get; set; } = string.Empty;
        public string? Document { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }

        public Customer AssignToEntity()
        {
            return new Customer
            {
                Name = Name,
                Document = Document,
                Email = Email,
                PhoneNumber = PhoneNumber,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow
            };
        }
    }
}
