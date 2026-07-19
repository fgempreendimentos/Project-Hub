# Rascunho — solicitação de suporte Mercado Livre Developers

**Client ID da aplicação:** 2314936081844743

**Assunto:** Acesso bloqueado por política (403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES) em endpoints públicos de busca, mesmo com token OAuth válido

**Mensagem:**

Olá,

Sou desenvolvedor de uma aplicação (Client ID 2314936081844743) que funciona como
agregador de ofertas: busca promoções em múltiplas fontes (incluindo produtos do
Mercado Livre), aplica filtros de qualidade (desconto real, disponibilidade,
avaliação), e divulga as aprovadas para um grupo de WhatsApp com o link
convertido para o Programa de Afiliados do Mercado Livre (parâmetros
matt_word/matt_tool) — ou seja, o uso gera tráfego e vendas direcionadas para o
Mercado Livre.

Gero um token OAuth válido via client_credentials normalmente (confirmei que
funciona: `/users/me` retorna os dados da conta sem erro). Porém, os seguintes
endpoints retornam 403 com o código `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`
("At least one policy returned UNAUTHORIZED"), mesmo com esse mesmo token
válido:

- `GET /sites/MLB/search?q=...`
- `GET /sites/MLB`
- `GET /sites/MLB/categories`
- `GET /highlights/MLB/category/{categoryId}`

Já conferi as permissões funcionais da aplicação nas configurações do painel de
desenvolvedor e [descreva aqui o que você encontrou: se os escopos de
leitura/gravação já estavam habilitados, ou se havia algo pendente].

Poderiam confirmar:

1. Se esses endpoints exigem uma permissão/nível de acesso adicional que
   preciso solicitar especificamente para esta aplicação;
2. Se há alguma validação de identidade pendente na minha conta de
   desenvolvedor que esteja causando esse bloqueio;
3. Qual o processo para liberar acesso de busca/descoberta de produtos para
   uma aplicação com o perfil de uso descrito acima (agregador de ofertas com
   conversão para link de afiliado do Mercado Livre).

Fico à disposição para fornecer qualquer informação adicional sobre a
aplicação.

Obrigado.
