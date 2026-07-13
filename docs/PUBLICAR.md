# Como publicar (deploy)

## Pré-requisitos na VPS

- Docker + Docker Compose instalados
- Acesso normal à internet (sem restrições de rede — ver nota importante no final)
- Porta 3000 liberada (ou a que você configurar em `PORT`)

## Passo a passo

```bash
git clone <url-do-repositorio>
cd affiliate-whatsapp-bot

cp .env.example .env
# edite o .env com os valores reais de produção

docker compose up --build -d
docker compose logs -f app
```

No primeiro start, o `docker-entrypoint.sh` roda automaticamente:
1. `prisma migrate deploy` — aplica as migrations no banco (criado em `./data/db/app.db`, persistido via volume)
2. `prisma db seed` — garante que as 5 fontes estejam cadastradas (idempotente, seguro rodar toda vez)
3. Sobe o servidor (`node dist/index.js`)

O QR Code do WhatsApp aparece no log (`docker compose logs -f app`). Escaneie
com o número dedicado ao bot. A sessão fica persistida em
`./data/whatsapp-auth` — não é preciso escanear de novo em restarts normais.

## Volumes persistidos

| Volume host | Conteúdo | Por quê importa |
|---|---|---|
| `./data/db` | Banco SQLite | Perder isso = perder todo o histórico de ofertas/estatísticas |
| `./data/whatsapp-auth` | Sessão do Baileys | Perder isso = precisa escanear o QR Code de novo |
| `./data/logs` | Logs (Winston) | Auditoria/depuração |

Faça backup da pasta `./data/` periodicamente.

## Dashboard

Acesse `http://<ip-da-vps>:3000/dashboard`. Se configurou
`DASHBOARD_USER`/`DASHBOARD_PASSWORD` no `.env`, o navegador vai pedir usuário
e senha (HTTP Basic Auth). Sem essas variáveis, fica sem autenticação — não
recomendado expor assim publicamente.

---

## ⚠️ Checagem final antes de operar de verdade

Este projeto foi desenvolvido em um ambiente de sessão com acesso de rede
restrito por política de egress (só uma lista de hosts pré-aprovados era
alcançável — nem sites de e-commerce, nem `api.openai.com`, nem `docker.io`
eram permitidos). Isso foi verificado e documentado a cada etapa. Antes de
colocar o bot para operar de verdade, valide nesta ordem, num ambiente com
internet normal (sua VPS):

1. **`docker compose up --build`** — a primeira vez que a imagem realmente é
   construída de ponta a ponta (pull do `node:22-bookworm-slim`, compilação
   nativa do `better-sqlite3`, download do Chromium pelo Playwright). Watch
   os logs de build por erros.
2. **WhatsApp**: escaneie o QR Code, confirme "WhatsApp conectado." no log, e
   confirme que uma mensagem de teste chega no grupo configurado.
3. **Scrapers**: acompanhe os logs por 1 ciclo de cada fonte (5 min para
   Mercado Livre/Amazon/Shopee, 2 min para Pelando/Promobit). Se algum
   adapter falhar (403, seletor não encontrado, timeout), o log vai indicar
   qual — os seletores de Amazon e Shopee (`src/scrapers/amazon/`,
   `src/scrapers/shopee/`) e as URLs de RSS de Pelando/Promobit
   (`src/scrapers/pelando/`, `src/scrapers/promobit/`) foram escritos com
   base em conhecimento geral da estrutura desses sites, **não testados
   contra o HTML/feed real** — é esperado precisar ajustar seletores aqui.
   Mercado Livre usa a API pública oficial, tem menor risco de quebrar.
4. **IA**: com `OPENAI_KEY` configurada, confirme que o texto gerado tem uma
   frase de chamada da IA (e não caiu no fallback do template — o log avisa
   `"Falha ao gerar texto via IA, usando template padrão"` se isso acontecer).
5. **Afiliados**: confirme que os links enviados de fato redirecionam para
   sua conta de afiliado (clique em um link de teste e veja se o parâmetro
   de rastreio aparece na URL final).

Nenhum desses pontos exige mudança de arquitetura — são ajustes pontuais nos
arquivos citados, isolados uns dos outros graças aos adapters.
