# Status do Servidor

O painel **Administração → Status do Servidor** consulta `GET /api/admin/server-status` com o JWT da sessão. A política `AdminOnly` exige a função `Admin`. A consulta é somente leitura e a resposta de sucesso usa `Cache-Control: no-store`.

## Configuração da API

No Ubuntu, a API lê `/proc/stat` e `/proc/meminfo`. O percentual de CPU usa a diferença entre duas amostras agregadas. A RAM usada é `MemTotal - MemAvailable`. A CPU normalmente fica em coleta inicial até o segundo ciclo. A tela atualiza a cada 30 segundos enquanto visível, com opção de atualização manual. [Documentação do procfs no Linux](https://docs.kernel.org/filesystems/proc.html)

No Windows, a API usa `GetSystemTimes` e `GlobalMemoryStatusEx` e a tela identifica o host Windows. Em ambas as plataformas, métricas sem leitura válida retornam `null`. A API não possui provider de simulação. [GetSystemTimes](https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-getsystemtimes), [GlobalMemoryStatusEx](https://learn.microsoft.com/windows/win32/api/sysinfoapi/nf-sysinfoapi-globalmemorystatusex)

| Configuração de ambiente | Padrão | Finalidade |
| --- | --- | --- |
| `ServerStatus__BackupStatusPath` | `/var/lib/ceramisys/backup-status.json` no Linux. Opcional no Windows | Caminho absoluto do arquivo de status |
| `ServerStatus__SampleIntervalSeconds` | `10` | Intervalo de coleta da API |
| `ServerStatus__BackupStaleAfterHours` | `30` | Prazo para considerar desatualizada uma tentativa concluída |
| `ServerStatus__BackupRunningStaleAfterHours` | `3` | Prazo para sinalizar uma tentativa que permaneceu em execução |

O arquivo ausente, inacessível ou inválido é sinalizado no painel. Quando o arquivo fica desatualizado, o painel preserva as informações do registro disponível e sinaliza sua idade. O último sucesso completo só é registrado quando a rotina confirma a geração local e o envio ao Google Drive. Na primeira publicação, esse campo pode permanecer indisponível até o próximo sucesso real.

## Preparação na VPS

O script instalado em `/usr/local/bin/backup-ceramica.sh` e as unidades `systemd` da VPS não estão no repositório. Integre o publicador à rotina instalada usando os pontos indicados abaixo. O arquivo fica em `/var/lib/ceramisys`, separado dos binários publicados e dos dumps em `/var/backups/Backups`. O timer `backup-ceramica.timer`, sua execução à meia-noite de Fortaleza, a retenção e a configuração do rclone continuam sob controle da rotina atual.

1. Confira a identidade de execução das duas unidades. Se `User` estiver vazio em uma unidade de sistema, ela executa como `root`. No ambiente descrito, `api-ceramicacanelas.service` usa `cjm`.

   ```bash
   systemctl show api-ceramicacanelas.service -p User
   systemctl show backup-ceramica.service -p User -p Group -p ProtectSystem -p ReadWritePaths
   ```

2. Crie um grupo de leitura dedicado e inclua o usuário da API. A identidade do backup deve possuir o diretório. O bit `setgid` no modo `2750` faz os arquivos novos herdarem o grupo de leitura. O publicador grava o JSON com modo `0640`.

   ```bash
   getent group ceramisys-backup-status >/dev/null || sudo groupadd --system ceramisys-backup-status
   sudo usermod -aG ceramisys-backup-status cjm
   backup_user=$(systemctl show backup-ceramica.service -p User --value)
   sudo install -d -o "${backup_user:-root}" -g ceramisys-backup-status -m 2750 /var/lib/ceramisys
   sudo install -d -o root -g root -m 0755 /usr/local/lib/ceramisys
   sudo install -o root -g root -m 0755 deploy/server-status/publish-backup-status.py /usr/local/lib/ceramisys/publish-backup-status.py
   ```

   Execute o último comando a partir de uma cópia da revisão publicada ou usando o caminho local do arquivo transferido. O publicador usa Python 3.10 ou superior, somente com biblioteca padrão. Para um serviço de backup com `ProtectSystem=strict`, confira se `/var/lib/ceramisys` é gravável no namespace da unidade. Se a unidade bloquear a gravação, acrescente `ReadWritePaths=/var/lib/ceramisys` em um drop-in de `backup-ceramica.service` e recarregue as unidades com `systemctl daemon-reload`. A API precisa apenas de leitura. [Opções de sandbox de systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)

3. Adicione este trecho ao script de backup, antes de iniciar o dump. Mantenha o mesmo horário de início em todos os eventos dessa execução.

   ```bash
   backup_started_at=$(date -u +'%Y-%m-%dT%H:%M:%S.%6NZ')
   backup_status_event() {
       /usr/bin/python3 /usr/local/lib/ceramisys/publish-backup-status.py \
           "$1" "$backup_started_at" \
           || printf '%s\n' 'Ceramisys: não foi possível publicar o status do backup.' >&2
   }
   backup_status_event start
   ```

   | Ponto no script existente | Evento a inserir |
   | --- | --- |
   | Dump, compressão e finalização do arquivo local concluídos | `backup_status_event local-succeeded` |
   | Falha em qualquer etapa que impede a criação do backup local | `backup_status_event local-failed` |
   | Comando de envio ao Google Drive concluído com código zero | `backup_status_event drive-succeeded` |
   | Falha no envio ao Google Drive, após as tentativas que já existirem | `backup_status_event drive-failed` |
   | Saída antecipada ou sinal tratado durante a etapa de dump ou envio | `backup_status_event interrupted` |

   Insira os eventos nos caminhos de sucesso e falha que o script já usa. Em um ramo de erro, capture `$?` em uma variável antes de chamar o publicador e preserve o tratamento e o código de saída originais. Se houver um pipeline, preserve o teste de falha existente e a configuração de `pipefail`. Integre `interrupted` aos handlers existentes onde houver uma etapa aberta. Um encerramento abrupto sem handler deixa o registro em execução até atingir o prazo de desatualização. Use `bash -n /usr/local/bin/backup-ceramica.sh` para validar a edição. O publicador não recebe saída do dump ou do rclone e o endpoint só retorna mensagens predefinidas.

4. Publique backend e frontend conforme a configuração atual do Nginx e dos serviços `api-ceramicacanelas.service` e `ceramisys-front`. Na ausência de um caminho personalizado, a API no Ubuntu usa `/var/lib/ceramisys/backup-status.json` sem configuração adicional. Reinicie a API pelo procedimento de implantação existente para carregar a revisão e a associação ao grupo. Após a próxima execução agendada, verifique a leitura do JSON com a identidade da API.

   ```bash
   sudo -u cjm test -r /var/lib/ceramisys/backup-status.json
   sudo -u cjm python3 -m json.tool /var/lib/ceramisys/backup-status.json
   systemctl list-timers backup-ceramica.timer
   sudo journalctl -u backup-ceramica.service -n 50 --no-pager
   ```

## Verificação após a publicação

- Faça login com um administrador e abra **Administração → Status do Servidor**. Aguarde dois ciclos de coleta se a API acabou de iniciar. Confirme `metrics.source: linux`, `metrics.isSimulated: false`, a CPU entre 0 e 100 e a RAM usada mais a disponível igual à RAM total.
- Inspecione a requisição na aba **Rede** do navegador ou consulte o endpoint com o token da sua sessão. Espere `200` e `Cache-Control: no-store` para administrador, `401` sem autenticação e `403` para um usuário autenticado sem a função de administrador. Use o domínio da API já configurado no sistema.

  ```bash
  read -rsp 'JWT de administrador: ' token; printf '\n'
  printf 'Authorization: Bearer %s\n' "$token" \
      | curl --silent --show-error --include --header @- 'https://DOMINIO_DA_API/api/admin/server-status'
  unset token
  ```

- Confira a primeira execução real pelo journal e compare o arquivo lido como `cjm` com o painel. `lastSuccessfulAt` deve corresponder ao fim da última execução que concluiu as duas etapas e permanecer igual se uma execução posterior falhar. A API retorna horários com fuso explícito e a tela exibe horários de Fortaleza.

## Arquivo de exemplo para Windows

Salve o JSON abaixo em um arquivo local fora do deploy e configure `ServerStatus__BackupStatusPath` antes de iniciar a API. Em PowerShell, por exemplo, `$env:ServerStatus__BackupStatusPath = 'C:\Temp\backup-status.json'`. O conteúdo é um exemplo de teste e a data antiga permite verificar o estado desatualizado. Para verificar o estado vigente, use três horários coerentes próximos do horário atual. No Windows, use o arquivo de exemplo somente no ambiente de desenvolvimento.

```json
{
  "schemaVersion": 1,
  "startedAt": "2026-01-02T03:00:00+00:00",
  "finishedAt": "2026-01-02T03:01:45+00:00",
  "localStatus": "succeeded",
  "driveStatus": "succeeded",
  "lastSuccessfulAt": "2026-01-02T03:01:45+00:00",
  "errorCode": null
}
```
