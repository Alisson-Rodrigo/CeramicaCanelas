using CeramicaCanelas.Application.Contracts.Application.Services;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Mail;



namespace CeramicaCanelas.Application.Services.SMTPEmail
{
    public class Send : ISend
    {
        private readonly IConfiguration _configuration;

        public Send(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        /// <summary>
        /// Envia um e-mail com o link para recuperação de senha.
        /// </summary>
        /// <param name="recipientEmail">E-mail do destinatário.</param>
        /// <param name="recoveryLink">Link para a recuperação de senha.</param>
        /// <returns>True se enviado com sucesso, false caso contrário.</returns>
        public bool SendRecoveryEmail(string recipientEmail, string recoveryLink)
        {
            try
            {
                string host = GetSetting("SMTP:Host", "SMTP_HOST");
                string displayName = GetSetting("SMTP:Nome", "SMTP_NAME");
                string senderEmail = GetSetting("SMTP:UserName", "SMTP_USERNAME");
                string senderPassword = GetSetting("SMTP:Senha", "SMTP_PASSWORD");
                string portSetting = GetSetting("SMTP:Porta", "SMTP_PORT");

                if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(senderPassword))
                {
                    return false;
                }

                if (!int.TryParse(portSetting, out int port) || port is < 1 or > 65535)
                {
                    return false;
                }

                MailMessage mail = new MailMessage
                {
                    From = new MailAddress(senderEmail, displayName)
                };

                mail.To.Add(recipientEmail);
                mail.Subject = "Recuperação de Senha";
                mail.Body = $@"
                    <html>
                        <body>
                            <p>Olá,</p>
                            <p>Para redefinir sua senha, clique no link abaixo:</p>
                            <p><a href='{recoveryLink}'>Recuperar Senha</a></p>
                            <p>Se você não solicitou a recuperação, ignore este e-mail.</p>
                        </body>
                    </html>";
                mail.IsBodyHtml = true;
                mail.Priority = MailPriority.High;

                using (SmtpClient smtp = new SmtpClient(host, port))
                {
                    smtp.Credentials = new NetworkCredential(senderEmail, senderPassword);
                    smtp.EnableSsl = true;
                    smtp.Send(mail);
                }

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        private string GetSetting(string configurationKey, string environmentKey)
        {
            var configuredValue = _configuration[configurationKey];
            if (!string.IsNullOrWhiteSpace(configuredValue)) return configuredValue;
            return Environment.GetEnvironmentVariable(environmentKey) ?? string.Empty;
        }

    }
}
