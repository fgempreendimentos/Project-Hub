# Arquitetura

Este documento define a arquitetura do sistema antes da implementação (Etapa 2).
Decisões aqui guiam a estrutura de pastas (Etapa 3) e o schema de banco (Etapa 4).

## 1. Camadas e direção de dependência

```
┌─────────────────────────────────────────────────────────┐
│ Interface                                                │
│  api/ (Express routes)  dashboard/ (views)  scheduler/   │
│  bot/whatsapp (Baileys entrypoint)                       │
└───────────────────────────┬───────────────────────────────┘
                            │ chama
┌───────────────────────────▼───────────────────────────────┐
│ Application (services / use cases)                        │
│  OfferPipelineService, StatsService, AffiliateLinkService  │
└───────────────────────────┬───────────────────────────────┘
                            │ depende de interfaces de
┌───────────────────────────▼───────────────────────────────┐
│ Domain                                                     │
│  Entities (Product, Offer, Source, Message, Click...)      │
│  Interfaces: SourceAdapter, OfferValidator, Publisher,      │
│  Repository<T>, TextGenerator, AffiliateLinkConverter       │
└───────────────────────────▲───────────────────────────────┘
                            │ implementa
┌───────────────────────────┴───────────────────────────────┐
│ Infrastructure                                             │
│  scrapers/* (Mercado Livre, Amazon, Shopee, Pelando,        │
│  Promobit)  database/ (Prisma repos)  bot/whatsapp (Baileys)│
│  services/ai (OpenAI)  utils/logger (Winston)               │
└─────────────────────────────────────────────────────────────┘
```

Regra fixa: **Domain não importa nada de Infrastructure ou Application**. Application só
conhece as interfaces do Domain, nunca uma implementação concreta (ex.: nunca importa
`AmazonScraper` diretamente, só `SourceAdapter`). Isso é o que permite trocar SQLite por
Postgres, Baileys por outra lib, ou adicionar Telegram, sem tocar no núcleo (Dependency
Inversion Principle).

## 2. Contratos principais (Domain)

```typescript
// domain/adapters/source-adapter.ts
interface SourceAdapter {
  readonly sourceName: string;
  fetchOffers(): Promise<RawOffer[]>;
}

// domain/validation/offer-validator.ts
interface OfferValidator {
  readonly name: string; // ex: "FalsoDescontoValidator"
  validate(offer: RawOffer, context: ValidationContext): ValidationResult;
}

// domain/publishing/publisher.ts
interface Publisher {
  readonly channel: 'whatsapp' | 'telegram' | 'discord';
  publish(message: OutgoingMessage): Promise<void>;
}

// domain/ai/text-generator.ts
interface TextGenerator {
  generate(offer: ValidatedOffer): Promise<string>;
}

// domain/affiliate/affiliate-link-converter.ts
interface AffiliateLinkConverter {
  readonly platform: string;
  convert(originalUrl: string): string;
}

// domain/repositories/repository.ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
}
// Repositórios específicos (ProductRepository, OfferRepository, ClickRepository...)
// estendem esse contrato só com os métodos de consulta que cada um realmente precisa
// (Interface Segregation — nada de um "GodRepository" com métodos que a maioria não usa).
```

Cada scraper concreto (`AmazonScraper`, `MercadoLivreScraper`, ...) implementa
`SourceAdapter`. Cada regra de rejeição (falso desconto, preço inflado, produto
indisponível, frete abusivo, promoção encerrada) é **uma classe própria** implementando
`OfferValidator` — isso é Single Responsibility: cada validador testa uma coisa e só uma.

## 3. Pipeline de uma oferta (fluxo de dados)

```
Scheduler dispara job da fonte X
   → SourceAdapter.fetchOffers()                      [Infra]
   → dedupe check (hash da URL/produto na History)     [Application]
   → ValidatorChain.run(offer)                          [Domain, Strategy/Chain of Responsibility]
        ├─ falha em qualquer validador → grava em Logs como "rejeitado" + motivo, encerra
        └─ passa em todos → segue
   → AffiliateLinkConverter.convert(url)                [Domain/Infra]
   → TextGenerator.generate(offer)                      [Infra: OpenAI]
   → monta OutgoingMessage (texto + imagem se existir)
   → Publisher.publish(message)                         [Infra: Baileys — enfileirado]
   → persiste Offer + Message + History                 [Infra: Prisma]
   → atualiza estatísticas agregadas                     [Application: StatsService]
```

`OfferPipelineService` (Application) orquestra esse fluxo. Ele não sabe *como* cada
scraper busca dados nem *como* o Publisher envia — só conhece as interfaces. Isso é o
que possibilita: (a) trocar um scraper de "scraping puro" para "API oficial" sem tocar no
pipeline, e (b) adicionar Telegram/Discord como um novo `Publisher`, publicando na mesma
oferta validada, sem duplicar a lógica de validação.

## 4. Fila de envio e rate limit (WhatsApp)

`WhatsappPublisher` não envia direto — empilha mensagens em uma fila interna (in-memory,
persistida na tabela `Messages` com status `pending/sent/failed`) processada por um
worker com intervalo mínimo entre envios (configurável, ex. 15-30s) para evitar flood e
reduzir o já citado risco de ban. Reconexão do Baileys é tratada no próprio adapter,
transparente para o resto do sistema.

## 5. Resiliência e detecção de fonte offline

Cada `SourceAdapter` reporta falhas ao `OfferPipelineService`. Falhas consecutivas acima
de um limiar marcam a `Source` como `offline` na tabela `Sources` (usado pelo dashboard
em "Fontes online/offline"). Isso é uma decisão de infraestrutura, não do domínio: o
scraper não sabe que está sendo marcado como offline, só propaga o erro.

## 6. Tratamento global de erros

- Domain/Application lançam erros tipados: `ScrapingError`, `ValidationError`,
  `PublishError`, `AffiliateConversionError` (todos estendendo uma `AppError` base com
  `code` e `context`).
- Infra (Express) tem um middleware único de erro que loga via Winston e responde
  padronizado — nunca um `try/catch` silencioso espalhado pelo código.
- Scrapers e o worker de envio nunca deixam uma exceção não tratada derrubar o processo:
  o erro é capturado no nível do `OfferPipelineService`/worker, logado, e o ciclo
  seguinte tenta de novo.

## 7. Injeção de dependência

Sem framework de DI (evita complexidade desnecessária para o tamanho do projeto).
Usamos **injeção via construtor + um composition root** (`src/config/container.ts`):
um único lugar monta as instâncias concretas (Prisma repos, scrapers, Baileys client,
OpenAI client) e injeta nas services. Isso mantém testabilidade (mockar interfaces nos
testes) sem adicionar uma dependência extra só para isso.

## 8. Extensibilidade (por que essa arquitetura permite crescer)

- **Nova fonte de scraping**: criar pasta em `scrapers/<nome>/`, implementar
  `SourceAdapter`, registrar no composition root e no scheduler. Zero mudança no
  pipeline, nos validadores ou no publisher.
- **Novo canal (Telegram/Discord)**: criar `bot/telegram/TelegramPublisher.ts`
  implementando `Publisher`, registrar no composition root. O `OfferPipelineService`
  publica em todos os `Publisher[]` configurados sem saber quantos ou quais existem.
- **Trocar scraping por API oficial** numa fonte específica: o `SourceAdapter` daquela
  fonte muda por dentro (de Cheerio/Playwright para uma chamada HTTP à API), a
  interface e todo o resto do sistema não mudam.
- **Site público**: consome a mesma API do dashboard (`api/`), que já expõe os dados via
  Repository/Service — não precisa de uma nova camada de acesso a dados.

## 9. Mapeamento explícito para SOLID

| Princípio | Onde aparece |
|---|---|
| SRP | Um validador = uma regra; um scraper = uma fonte; um Publisher = um canal |
| OCP | Adicionar fonte/canal/validador = novo arquivo, zero edição do pipeline existente |
| LSP | Qualquer `SourceAdapter` ou `Publisher` é substituível por outro sem quebrar o `OfferPipelineService` |
| ISP | Interfaces pequenas e específicas (`SourceAdapter`, `Publisher`, `TextGenerator`...) em vez de uma interface única "faz tudo" |
| DIP | Application e Domain dependem de interfaces; Infrastructure é o único lugar que conhece Prisma, Baileys, OpenAI, Cheerio/Playwright concretamente |

## 10. Decisões já validadas com você (Etapa 1)

- WhatsApp: número dedicado ao bot.
- Fontes: 100% scraping inicialmente, adapters isolados para migrar por fonte à API oficial depois.
- IA: OpenAI, isolado atrás da interface `TextGenerator` (troca de provedor não afeta o pipeline).
- Deploy: VPS própria — Docker Compose com volumes persistentes para SQLite e sessão do Baileys (detalhado na Etapa 9).
