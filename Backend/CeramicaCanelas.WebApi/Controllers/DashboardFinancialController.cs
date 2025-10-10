using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.BalanceByAccountsPayReport;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.BalanceByCategoryRequest;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.DashboardFinancialSummaryResult;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.PagedRequestCashFlowReport;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.PagedRequestLaunchByClient;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.PendingLaunchQuery;
using CeramicaCanelas.Application.Features.Financial.FinancialBox.Queries.TrialBalanceWithExtractRequest;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;

namespace CeramicaCanelas.WebApi.Controllers
{
    [Route("api/financial/dashboard-financial")]
    [OpenApiTags("Dashboard-financial")]

    [ApiController]
    public class DashboardFinancialController(IMediator mediator) : ControllerBase
    {
        private readonly IMediator _mediator = mediator;

        [Authorize(Roles = "Financial,Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [HttpGet("flow-report")]
        public async Task<IActionResult> GetFlowReport([FromQuery] PagedRequestCashFlowReport query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize(Roles = "Financial,Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [HttpGet("balance-expense")]
        public async Task<IActionResult> GetBalanceExpense([FromQuery] PagedRequestBalanceExpense query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize(Roles = "Financial,Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [HttpGet("balance-income")]
        public async Task<IActionResult> GetBalanceIncome([FromQuery] PagedRequestBalanceIncome query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var result = await _mediator.Send(new DashboardFinancialSummaryQuery());
            return Ok(result);
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("summary/pending")]
        public async Task<IActionResult> GetPendingLaunches([FromQuery] PendingLaunchQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize(Roles = "Financial,Admin")]
        [HttpGet("clients-balance")]
        // Correção: agora usa o objeto de REQUISIÇÃO como parâmetro
        public async Task<IActionResult> GetClientsBalance([FromQuery] PagedClientIncomeRequest query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("with-extract")]
        public async Task<IActionResult> GetWithExtract([FromQuery] TrialBalanceWithExtractRequest request)
        {
            var result = await _mediator.Send(request);
            return Ok(result);
        }


    }
}
