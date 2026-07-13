#!/bin/sh
set -e

echo "Aplicando migrations do banco..."
npx prisma migrate deploy

echo "Garantindo que as 5 fontes estejam cadastradas..."
npx prisma db seed

exec "$@"
