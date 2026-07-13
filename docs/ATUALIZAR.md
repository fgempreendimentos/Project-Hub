# Como atualizar

## Atualizar o código em produção (Docker)

```bash
git pull
docker compose up --build -d
docker compose logs -f app
```

O `docker-entrypoint.sh` roda `prisma migrate deploy` automaticamente a cada
start — se a atualização incluiu uma nova migration do Prisma, ela é aplicada
sozinha, sem passo manual.

## Atualizar em desenvolvimento local

```bash
git pull
npm install            # caso dependências tenham mudado
npx prisma migrate dev # aplica migrations novas
npm run dev
```

## Alterando o schema do banco

1. Edite `prisma/schema.prisma`
2. `npx prisma migrate dev --name descricao_da_mudanca` (gera e aplica a migration em dev)
3. Commit a pasta `prisma/migrations/` gerada
4. Em produção, `prisma migrate deploy` (já automático no entrypoint) aplica a mesma migration

## Rollback

Docker Compose não some com o volume `./data/` ao atualizar — se uma versão
nova quebrar algo, `git checkout <commit-anterior>` e `docker compose up
--build -d` volta ao código anterior sem perder banco/sessão do WhatsApp.
Migrations do Prisma não têm rollback automático; se precisar desfazer uma
migration de banco, restaure o backup de `./data/db/app.db`.
