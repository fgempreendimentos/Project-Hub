# Fluxograma

## Ciclo de vida de uma oferta

```mermaid
flowchart TD
    A[Scheduler dispara o job da fonte] --> B[SourceAdapter.fetchOffers]
    B -->|falhou| B1[Marca fonte com falha<br/>3 falhas seguidas → OFFLINE]
    B -->|ok| C[Para cada oferta bruta]
    C --> D[Upsert do Product]
    D --> E{Validadores em cadeia}
    E -->|duplicidade| R[Offer REJECTED<br/>+ motivo registrado]
    E -->|indisponível/encerrada| R
    E -->|desconto < mínimo| R
    E -->|desconto não confere com o real| R
    E -->|preço "de" inflado vs. histórico| R
    E -->|preço não abaixo da média histórica| R
    E -->|avaliação abaixo do mínimo| R
    E -->|poucas avaliações| R
    E -->|frete abusivo| R
    E -->|passou em todos| F[Converter link de afiliado<br/>pelo domínio de destino]
    F -->|loja sem programa configurado| R
    F -->|ok| G[Offer APPROVED]
    G --> H[Grava preço na History]
    H --> I[Gera texto da oferta<br/>IA ou template, nunca inventa número]
    I --> J[Publisher.publish para cada canal]
    J -->|sucesso| K[Message SENT<br/>Offer SENT]
    J -->|falha| L[Message FAILED<br/>Offer continua APPROVED]
    K --> M[Cliente clica no link /r/:offerId]
    M --> N[Registra Click e redireciona<br/>para a loja real]
```

## Camadas (ver `ARCHITECTURE.md` para os detalhes)

```mermaid
flowchart LR
    subgraph Interface
        API[api/] --- DASH[dashboard/] --- SCHED[scheduler/] --- BOT[bot/whatsapp]
    end
    subgraph Application
        SVC[services/]
    end
    subgraph Domain
        TYPES[types/ - interfaces e DTOs]
    end
    subgraph Infrastructure
        SCRAPERS[scrapers/] --- DB[database/] --- AI[services/text OpenAI]
    end

    Interface --> Application
    Application --> Domain
    Infrastructure -.implementa.-> Domain
