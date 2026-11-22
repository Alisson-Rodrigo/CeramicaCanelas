using Microsoft.AspNetCore.HttpOverrides;

namespace CeramicaCanelas.WebApi.Auditing;

public static class TrustedForwardedHeadersOptions
{
    public static ForwardedHeadersOptions Create(IConfiguration configuration)
    {
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = 1
        };
        options.KnownProxies.Clear();
        options.KnownNetworks.Clear();
        foreach (var proxy in configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? Array.Empty<string>())
            if (System.Net.IPAddress.TryParse(proxy, out var address)) options.KnownProxies.Add(address);
        // No ASP.NET Core, listas de confiança vazias podem significar aceitar qualquer proxy.
        // Sem proxies explicitamente configurados, não processe nenhum cabeçalho encaminhado.
        if (options.KnownProxies.Count == 0)
            options.ForwardedHeaders = ForwardedHeaders.None;
        return options;
    }
}
