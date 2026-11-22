using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using CeramicaCanelas.WebApi.Assistant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CeramicaCanelas.WebApi.Controllers;

[ApiController]
[Route("api/assistant")]
[Authorize(Roles = "Admin,Viewer,Financial,Almoxarifado,Sales")]
[EnableRateLimiting("assistant")]
public sealed class AssistantController(IAssistantChatService assistant) : ControllerBase
{
    [HttpPost("chat")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [ProducesResponseType(typeof(AssistantChatReply), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Chat([FromForm, Required] string? messages,
        [FromForm] List<IFormFile>? images, [FromForm] IFormFile? audio, CancellationToken cancellationToken)
    {
        // Escaping JSON can expand valid 8,000-character conversations; the multipart
        // request limit and parsed conversation limits below still cap the payload.
        if (string.IsNullOrWhiteSpace(messages) || messages.Length > 64_000)
            return BadRequest(new { message = "A conversa é obrigatória e deve respeitar o limite de tamanho." });

        List<AssistantMessage>? conversation;
        try { conversation = JsonSerializer.Deserialize<List<AssistantMessage>>(messages, new JsonSerializerOptions(JsonSerializerDefaults.Web)); }
        catch (JsonException) { return BadRequest(new { message = "O formato da conversa é inválido." }); }

        if (conversation is null || conversation.Count is < 1 or > 10 || conversation[0]?.Role != "user" || conversation[^1]?.Role != "user" ||
            conversation.Any(message => message is null || message.Role is not ("user" or "assistant") ||
                string.IsNullOrWhiteSpace(message.Content) || message.Content.Length > 2000) ||
            Enumerable.Range(1, conversation.Count - 1).Any(index => conversation[index]?.Role == conversation[index - 1]?.Role) ||
            conversation.Sum(message => message.Content.Length) > 8000)
            return BadRequest(new { message = "A conversa excede os limites permitidos ou tem formato inválido." });

        var upload = await AssistantAttachmentValidator.ValidateAsync(images ?? [], audio, cancellationToken);
        if (!upload.IsValid) return BadRequest(new { message = upload.Error });

        try { return Ok(await assistant.ReplyAsync(conversation, upload.Attachments, cancellationToken)); }
        catch (AssistantNotConfiguredException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "O assistente ainda não foi configurado pelo administrador." });
        }
        catch (AssistantQuotaException ex)
        {
            Response.Headers["Retry-After"] = ex.RetryAfterSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = $"O limite gratuito do assistente foi atingido. Tente novamente em cerca de {ex.RetryAfterSeconds} segundos."
            });
        }
        catch (AssistantProviderException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }
}
