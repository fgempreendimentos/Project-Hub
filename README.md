# Smart Affiliate Bot

Sistema de automação para divulgação de ofertas utilizando links de afiliados:
busca promoções em múltiplas fontes, valida se são realmente boas ofertas,
converte para o link de afiliado correto, gera o texto de divulgação e publica
em um grupo do WhatsApp — com histórico, deduplicação, logs e dashboard.

## O que o sistema faz

- Busca ofertas em Mercado Livre (API pública), Amazon e Shopee (scraping via
  Playwright), Pelando e Promobit (RSS)
- Rejeita: falso desconto, preço inflado, produto indisponível/promoção
  encerrada, frete abusivo, avaliação/nº de avaliações baixos, duplicidade
- Só aprova ofertas com desconto mínimo e preço abaixo da média histórica do produto
- Converte automaticamente para o link de afiliado da loja de destino
- Gera o texto da oferta (template fixo, ou IA — nunca inventa preço/desconto)
- Publica no WhatsApp com fila e rate limit (evita flood/banimento)
- Rastreia cliques por afiliado via link de redirecionamento próprio
- Dashboard web com KPIs, gráficos e saúde das fontes

## Stack

Node.js · TypeScript · Express · Prisma + SQLite · Baileys (WhatsApp) · Axios
· Cheerio · Playwright · node-cron · Winston · OpenAI (opcional) · Docker

## Começando

- **Rodar localmente**: [`docs/INSTALACAO.md`](docs/INSTALACAO.md)
- **Publicar em produção (Docker)**: [`docs/PUBLICAR.md`](docs/PUBLICAR.md)
- **Atualizar uma instalação existente**: [`docs/ATUALIZAR.md`](docs/ATUALIZAR.md)

## Documentação

| Documento | Conteúdo |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Camadas, contratos, padrões de projeto, decisões técnicas |
| [`docs/FLUXOGRAMA.md`](docs/FLUXOGRAMA.md) | Fluxo completo de uma oferta, do scraper ao clique |
| [`docs/INSTALACAO.md`](docs/INSTALACAO.md) | Setup local, variáveis de ambiente, scripts |
| [`docs/PUBLICAR.md`](docs/PUBLICAR.md) | Deploy via Docker + checklist de validação final |
| [`docs/ATUALIZAR.md`](docs/ATUALIZAR.md) | Atualizar código, migrations, rollback |
| [`docs/ADICIONAR_NOVAS_LOJAS.md`](docs/ADICIONAR_NOVAS_LOJAS.md) | Como plugar uma fonte/loja nova |
| [`docs/ALTERAR_AFILIADOS.md`](docs/ALTERAR_AFILIADOS.md) | Como trocar credenciais ou o mecanismo de conversão de link |

## Estrutura

```
src/
  api/          # rotas Express (estatísticas, redirecionamento de clique)
  bot/
    whatsapp/   # conexão Baileys, fila de envio
    telegram/   # reservado para expansão futura
  config/       # env, composition root (injeção de dependência)
  dashboard/    # painel web estático
  database/     # Prisma client + repositórios
  scheduler/    # node-cron, um job por fonte
  scrapers/     # um adapter por fonte (amazon, mercadolivre, shopee, pelando, promobit)
  services/
    affiliate/  # conversores de link por loja
    text/       # geração de texto (template ou IA)
    validation/ # um validador por regra de negócio
  types/        # interfaces do domínio (contratos)
  utils/        # logger, fila com rate limit
prisma/         # schema, migrations, seed
docs/           # documentação detalhada
```

## Status

Todas as 9 etapas do plano original foram implementadas: planejamento,
arquitetura, estrutura de pastas, banco de dados, WhatsApp, scrapers +
validação, dashboard, IA e deploy. Duas ressalvas documentadas em
[`docs/PUBLICAR.md`](docs/PUBLICAR.md#-checagem-final-antes-de-operar-de-verdade):
os seletores de scraping (Amazon/Shopee/Pelando/Promobit) e a chamada real à
OpenAI não puderam ser validados ao vivo durante o desenvolvimento por
restrição de rede do ambiente de sessão usado — a validação final fica para
quando o sistema rodar num ambiente com internet normal.

## Licença

MIT
