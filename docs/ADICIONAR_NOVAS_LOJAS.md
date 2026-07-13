# Como adicionar uma nova loja/fonte

Graças à arquitetura de adapters (ver `ARCHITECTURE.md`), adicionar uma fonte
nova não exige tocar no pipeline, nos validadores ou no publisher — só três
passos:

## 1. Criar o adapter

Crie uma pasta em `src/scrapers/<nome-da-fonte>/` com uma classe implementando
`SourceAdapter` (`src/types/source-adapter.ts`):

```typescript
import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';

export class MinhaLojaAdapter implements SourceAdapter {
  readonly sourceSlug = 'minhaloja'; // precisa bater com o slug cadastrado no seed

  async fetchOffers(): Promise<RawOffer[]> {
    // Buscar via API oficial (preferível) ou scraping (Cheerio/Playwright)
    // e devolver um RawOffer por oferta encontrada.
    return [];
  }
}
```

Prefira uma **API oficial** da loja quando existir (como fizemos com o
Mercado Livre) — é mais estável e reduz risco de bloqueio. Para scraping puro:
`Axios + Cheerio` para páginas estáticas, `Playwright` para páginas com JS
pesado ou proteção anti-bot (como Amazon/Shopee).

Reaproveite os utilitários em `src/scrapers/shared/` (`http-client.ts`,
`parse-brl-price.ts`, `extract-price.ts`, `rss-deal-parser.ts`,
`resolve-final-url.ts`) em vez de duplicar lógica de parsing.

## 2. Cadastrar a fonte no seed e no container

Em `prisma/seed.ts`, adicione a nova fonte à lista `sources`:

```typescript
{ name: 'Minha Loja', slug: 'minhaloja', type: 'SCRAPING', scheduleMinutes: 5 },
```

Rode `npm run prisma:seed` (idempotente — não duplica).

Em `src/config/container.ts`, registre o adapter e o intervalo do scheduler:

```typescript
minhaloja: buildPipeline(new MinhaLojaAdapter()),
```

```typescript
scheduler.schedule('minhaloja', env.schedule.minhalojaMinutes, pipelines.minhaloja);
```

Adicione `SCHEDULE_MINHALOJA_MINUTES` em `.env.example`/`.env` e em
`src/config/env.ts` (`schedule.minhalojaMinutes`).

## 3. Se a loja tiver programa de afiliado próprio

Se as ofertas dessa fonte apontam para uma loja com programa de afiliado que
ainda não existe em `src/services/affiliate/`, crie um `AffiliateLinkConverter`
(`matches(url)` + `convert(url)`) e registre-o em
`AffiliateLinkService` no `container.ts`. Sem isso, as ofertas dessa loja são
rejeitadas com "Sem programa de afiliado configurado" — o que é o
comportamento correto até você configurar a conversão.

## O que você NÃO precisa mexer

- Validadores (`src/services/validation/`) — já se aplicam a qualquer fonte
- `OfferPipelineService` — já orquestra qualquer `SourceAdapter`
- Dashboard/API — as métricas já agregam por `Source` automaticamente
