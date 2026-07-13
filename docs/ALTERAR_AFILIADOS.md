# Como alterar os links de afiliado

## Trocar sua credencial (caso mais comum)

Edite o `.env` e reinicie o serviço:

```bash
AFFILIATE_AMAZON=seu-tag-amazon-20
AFFILIATE_SHOPEE=seu-id-shopee
AFFILIATE_MERCADOLIVRE=seu-id-mercadolivre
```

Nenhum código precisa mudar — esses valores são injetados nos conversores em
`src/config/container.ts`.

## Mudar como o link é montado (formato do programa mudou)

Cada loja tem seu próprio conversor em `src/services/affiliate/`:

| Arquivo | Loja | Mecanismo atual |
|---|---|---|
| `amazon-link.converter.ts` | Amazon | `?tag=<AFFILIATE_AMAZON>` (Amazon Associates, estável e documentado) |
| `mercadolivre-link.converter.ts` | Mercado Livre | `?matt_word=<id>&matt_tool=<id>` |
| `shopee-link.converter.ts` | Shopee | `?af_id=<id>` — **verifique no seu painel de afiliado Shopee** se o mecanismo real é esse ou se exige um link gerado via API/dashboard (ver nota no arquivo) |

Para mudar o mecanismo de uma loja, edite o método `convert()` do conversor
correspondente — ele recebe a URL original e devolve a URL de afiliado. O
`matches()` decide, pelo domínio, se aquele conversor deve ser usado.

## Adicionar uma loja nova ao sistema de afiliados

Ver `ADICIONAR_NOVAS_LOJAS.md` §3.

## Importante

A escolha de qual conversor usar é feita pelo **domínio de destino da URL**,
não pela fonte que trouxe a oferta (`AffiliateLinkService`). Isso importa
porque Pelando/Promobit apontam para lojas variadas — uma oferta do Pelando
que aponta para a Amazon usa o `AmazonLinkConverter` normalmente.
