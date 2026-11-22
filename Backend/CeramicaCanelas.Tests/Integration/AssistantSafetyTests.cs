using System.Buffers.Binary;
using System.Net;
using System.Text;
using System.Text.Json;
using CeramicaCanelas.WebApi.Assistant;
using CeramicaCanelas.WebApi.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CeramicaCanelas.Tests.Integration;

public sealed class AssistantSafetyTests
{
    [Fact]
    public async Task EndpointIsRestrictedToExistingAuthenticatedRoles()
    {
        var authorize = typeof(AssistantController).GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>().Single();
        authorize.Roles.Should().Be("Admin,Viewer,Financial,Almoxarifado,Sales");
        typeof(AssistantController).GetCustomAttributes(typeof(EnableRateLimitingAttribute), true)
            .Cast<EnableRateLimitingAttribute>().Single().PolicyName.Should().Be("assistant");

        var service = new StubAssistantService();
        var controller = NewController(service);
        var result = await controller.Chat("[{\"role\":\"user\",\"content\":\"pergunta\"}]", null, null, default);
        result.Should().BeOfType<OkObjectResult>();
        service.Calls.Should().Be(1);
    }

    [Fact]
    public async Task MissingGeminiKeyFailsClosedWithoutCallingProvider()
    {
        var handler = new CaptureHandler(_ => throw new InvalidOperationException("No request expected"));
        using var client = new HttpClient(handler);
        var service = NewGemini(client, model: "gemini-4-hydrogen", apiKey: null, new TestLogger<AssistantChatService>());
        var act = () => service.ReplyAsync([new AssistantMessage("user", "pergunta")], [], default);
        await act.Should().ThrowAsync<AssistantNotConfiguredException>();
        handler.Calls.Should().Be(0);
    }

    [Fact]
    public async Task NativeGeminiRequestKeepsKeyInHeaderAndEmbedsOnlyValidatedMedia()
    {
        HttpRequestMessage? request = null;
        string? capturedBody = null;
        var handler = new CaptureHandler(message =>
        {
            request = message;
            capturedBody = message.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
            return JsonResponse("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Resposta segura\"}]}}]}");
        });
        using var client = new HttpClient(handler);
        var service = NewGemini(client, "gemini-4-hydrogen", "test-secret", new TestLogger<AssistantChatService>());
        var imageBytes = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10, 1, 2 };

        var reply = await service.ReplyAsync([new AssistantMessage("user", "O que vê nesta imagem?")],
            [new AssistantAttachment("image/png", imageBytes)], default);

        reply.Answer.Should().Be("Resposta segura");
        request!.RequestUri!.AbsolutePath.Should().EndWith("/v1beta/models/gemini-4-hydrogen:generateContent");
        request.Headers.Contains("x-goog-api-key").Should().BeTrue();
        request.RequestUri.Query.Should().NotContain("test-secret");
        var body = capturedBody!;
        body.Should().Contain("inlineData").And.Contain("image/png").And.Contain(Convert.ToBase64String(imageBytes));
        body.Should().Contain("systemInstruction");
        using var requestJson = JsonDocument.Parse(body);
        requestJson.RootElement.GetProperty("systemInstruction").GetProperty("parts")[0]
            .GetProperty("text").GetString().Should().Contain("Não há busca web");
    }

    [Fact]
    public async Task ProviderQuotaUsesSafeRetryDelayAndDoesNotLogPromptOrResponseBody()
    {
        var logger = new TestLogger<AssistantChatService>();
        var handler = new CaptureHandler(_ => JsonResponse(
            "{\"error\":{\"message\":\"SECRET_PROVIDER_BODY\",\"details\":[{\"retryDelay\":\"17s\"}]}}", HttpStatusCode.TooManyRequests));
        using var client = new HttpClient(handler);
        var service = NewGemini(client, "gemini-4-hydrogen", "test-secret", logger);

        var act = () => service.ReplyAsync([new AssistantMessage("user", "CPF 00000000000 CONFIDENTIAL_PROMPT")], [], default);

        var exception = await act.Should().ThrowAsync<AssistantQuotaException>();
        exception.Which.RetryAfterSeconds.Should().Be(17);
        string.Join("\n", logger.Entries).Should().NotContain("CONFIDENTIAL_PROMPT").And.NotContain("SECRET_PROVIDER_BODY");
    }

    [Fact]
    public async Task ProviderFailureLogsMetadataOnlyAndHidesProviderBody()
    {
        var logger = new TestLogger<AssistantChatService>();
        var handler = new CaptureHandler(_ => JsonResponse("SENSITIVE_ERROR_RESPONSE", HttpStatusCode.InternalServerError));
        using var client = new HttpClient(handler);
        var service = NewGemini(client, "gemini-4-hydrogen", "test-secret", logger);

        var act = () => service.ReplyAsync([new AssistantMessage("user", "SENSITIVE_USER_MESSAGE")], [], default);

        var exception = await act.Should().ThrowAsync<AssistantProviderException>();
        exception.Which.Message.Should().NotContain("SENSITIVE_ERROR_RESPONSE");
        string.Join("\n", logger.Entries).Should().NotContain("SENSITIVE_USER_MESSAGE").And.NotContain("SENSITIVE_ERROR_RESPONSE");
    }

    [Fact]
    public async Task TemporaryProviderOverloadRetriesOnceAndCanRecover()
    {
        var responses = new Queue<HttpResponseMessage>([
            JsonResponse("PRIVATE_OVERLOAD_BODY", HttpStatusCode.ServiceUnavailable),
            JsonResponse("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Resposta após nova tentativa\"}]}}]}")
        ]);
        var logger = new TestLogger<AssistantChatService>();
        var handler = new CaptureHandler(_ => responses.Dequeue());
        using var client = new HttpClient(handler);
        var service = NewGemini(client, "gemini-4-hydrogen", "test-secret", logger);

        var reply = await service.ReplyAsync([new AssistantMessage("user", "PERGUNTA_PRIVADA")], [], default);

        reply.Answer.Should().Be("Resposta após nova tentativa");
        handler.Calls.Should().Be(2);
        string.Join("\n", logger.Entries).Should().NotContain("PERGUNTA_PRIVADA").And.NotContain("PRIVATE_OVERLOAD_BODY");
    }

    [Fact]
    public async Task RepeatedProviderOverloadReturnsActionablePortugueseMessage()
    {
        var handler = new CaptureHandler(_ => JsonResponse("PRIVATE_OVERLOAD_BODY", HttpStatusCode.ServiceUnavailable));
        using var client = new HttpClient(handler);
        var service = NewGemini(client, "gemini-4-hydrogen", "test-secret", new TestLogger<AssistantChatService>());

        var act = () => service.ReplyAsync([new AssistantMessage("user", "pergunta")], [], default);

        (await act.Should().ThrowAsync<AssistantProviderException>()).Which.Message.Should()
            .Contain("temporariamente sobrecarregado").And.Contain("Tente enviar novamente");
        handler.Calls.Should().Be(2);
    }

    [Fact]
    public async Task ImageSignatureAndDeclaredMimeMustMatch()
    {
        var png = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10, 1, 2 };
        var valid = await AssistantAttachmentValidator.ValidateAsync([Upload(png, "image/png")], null, default);
        valid.IsValid.Should().BeTrue();
        valid.Attachments.Should().ContainSingle().Which.MimeType.Should().Be("image/png");

        var mismatch = await AssistantAttachmentValidator.ValidateAsync([Upload(png, "image/jpeg")], null, default);
        mismatch.IsValid.Should().BeFalse();
        mismatch.Error.Should().Contain("não corresponde");
    }

    [Fact]
    public async Task ImageSizeCountAndAudioDurationLimitsAreCheckedOnServer()
    {
        var tooLarge = new byte[AssistantAttachmentValidator.MaxImageBytes + 1];
        var largeResult = await AssistantAttachmentValidator.ValidateAsync([Upload(tooLarge, "image/png")], null, default);
        largeResult.Error.Should().Contain("5 MB");

        var threeImages = Enumerable.Range(0, 4).Select(_ => Upload(new byte[] { 1 }, "image/png")).ToList();
        var countResult = await AssistantAttachmentValidator.ValidateAsync(threeImages, null, default);
        countResult.Error.Should().Contain("no máximo 3 imagens");

        var wav90 = await AssistantAttachmentValidator.ValidateAsync([], Upload(Wav(90), "audio/wav"), default);
        wav90.IsValid.Should().BeTrue();
        var wav91 = await AssistantAttachmentValidator.ValidateAsync([], Upload(Wav(91), "audio/wav"), default);
        wav91.Error.Should().Contain("90 segundos");
    }

    [Fact]
    public async Task InvalidAudioFormatIsRejectedBeforeProviderCall()
    {
        var controller = NewController(new StubAssistantService());
        var result = await controller.Chat("[{\"role\":\"user\",\"content\":\"ouça\"}]", null,
            Upload(Encoding.UTF8.GetBytes("not a wav"), "audio/wav"), default);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UserTextAndMediaAreNotPersistedByAssistantService()
    {
        typeof(AssistantChatService).GetConstructors().Single().GetParameters()
            .Should().NotContain(parameter => parameter.ParameterType.Name.Contains("DbContext", StringComparison.Ordinal));
        typeof(AssistantChatService).GetMethods().Single(method => method.Name == "ReplyAsync").GetParameters()
            .Should().Contain(parameter => parameter.ParameterType == typeof(IReadOnlyList<AssistantAttachment>));
    }

    private static AssistantChatService NewGemini(HttpClient client, string model, string? apiKey, ILogger<AssistantChatService> logger)
    {
        var settings = new Dictionary<string, string?> { ["Assistant:Model"] = model, ["Assistant:ApiKey"] = apiKey };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new AssistantChatService(client, configuration, logger);
    }

    private static AssistantController NewController(IAssistantChatService service) => new(service)
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
    };

    private static FormFile Upload(byte[] bytes, string contentType)
    {
        var headers = new HeaderDictionary { ["Content-Type"] = contentType };
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "sample") { Headers = headers };
    }

    private static byte[] Wav(int seconds)
    {
        const int sampleRate = 16000;
        var dataSize = seconds * sampleRate * 2;
        var bytes = new byte[44 + dataSize];
        WriteTag(bytes, 0, "RIFF"); BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(4), 36 + dataSize);
        WriteTag(bytes, 8, "WAVE"); WriteTag(bytes, 12, "fmt ");
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(16), 16); BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(20), 1);
        BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(22), 1); BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(24), sampleRate);
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(28), sampleRate * 2); BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(32), 2);
        BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(34), 16); WriteTag(bytes, 36, "data");
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(40), dataSize);
        return bytes;
    }

    private static void WriteTag(byte[] target, int offset, string value) => Encoding.ASCII.GetBytes(value).CopyTo(target, offset);
    private static HttpResponseMessage JsonResponse(string json, HttpStatusCode statusCode = HttpStatusCode.OK) =>
        new(statusCode) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private sealed class CaptureHandler(Func<HttpRequestMessage, HttpResponseMessage> response) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        { Calls++; return Task.FromResult(response(request)); }
    }

    private sealed class StubAssistantService : IAssistantChatService
    {
        public int Calls { get; private set; }
        public Task<AssistantChatReply> ReplyAsync(IReadOnlyList<AssistantMessage> messages, IReadOnlyList<AssistantAttachment> attachments, CancellationToken cancellationToken)
        { Calls++; return Task.FromResult(new AssistantChatReply("Resposta teste", [])); }
    }

    private sealed class TestLogger<T> : ILogger<T>
    {
        public List<string> Entries { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        { Entries.Add(formatter(state, exception)); }
    }
}
