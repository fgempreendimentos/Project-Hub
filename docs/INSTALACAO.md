# Instalação

## Pré-requisitos

- Node.js 22+
- npm 10+
- Docker e Docker Compose (para rodar em produção via container)
- Um número de WhatsApp **dedicado ao bot** (não use seu número pessoal — ver `ARCHITECTURE.md` §10)

## Rodando localmente (sem Docker)

```bash
git clone <url-do-repositorio>
cd affiliate-whatsapp-bot
npm install

cp .env.example .env
# edite o .env com seus valores reais (grupo do WhatsApp, links de afiliado, chave da OpenAI...)

npx prisma migrate dev   # cria o banco SQLite e aplica as migrations
npx prisma db seed       # cadastra as 5 fontes (Mercado Livre, Amazon, Shopee, Pelando, Promobit)

npm run dev              # sobe o servidor com reload automático
```

Na primeira execução, um QR Code aparece no terminal — escaneie com o WhatsApp
que vai rodar o bot (Configurações → Aparelhos conectados → Conectar um aparelho).

Acesse `http://localhost:3000/dashboard` para ver o painel.

## Variáveis de ambiente

Todas as variáveis estão documentadas com comentários em `.env.example`. As
mais importantes para começar:

| Variável | O que é |
|---|---|
| `WHATSAPP_GROUP_ID` | ID do grupo do WhatsApp onde as ofertas serão publicadas (formato `xxxxx-xxxxx@g.us`) |
| `AFFILIATE_AMAZON` / `AFFILIATE_SHOPEE` / `AFFILIATE_MERCADOLIVRE` | Suas credenciais de afiliado em cada programa |
| `OPENAI_KEY` | Opcional — sem ela, o sistema usa um template de texto fixo em vez de IA |
| `DASHBOARD_USER` / `DASHBOARD_PASSWORD` | Opcional — protege o dashboard com HTTP Basic Auth |

### Como descobrir o `WHATSAPP_GROUP_ID`

Depois de conectar o bot (QR Code escaneado), adicione o número do bot ao
grupo desejado. O ID do grupo aparece nos logs (`src/logs/combined.log`) na
primeira vez que o bot receber qualquer evento daquele grupo, ou pode ser
obtido programaticamente com `sock.groupFetchAllParticipating()` do Baileys.

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe em modo desenvolvimento (reload automático) |
| `npm run build` | Compila TypeScript → `dist/` e copia o dashboard |
| `npm start` | Roda a versão compilada (`dist/index.js`) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run prisma:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run prisma:generate` | Regenera o Prisma Client |
| `npm run prisma:seed` | Recadastra as 5 fontes (idempotente) |

Para rodar via Docker, veja `PUBLICAR.md`.
