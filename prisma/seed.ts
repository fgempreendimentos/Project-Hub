import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./src/database/dev.db',
});
const prisma = new PrismaClient({ adapter });

const sources = [
  { name: 'Mercado Livre', slug: 'mercadolivre', type: 'API' as const, scheduleMinutes: 5 },
  { name: 'Amazon Brasil', slug: 'amazon', type: 'SCRAPING' as const, scheduleMinutes: 5 },
  { name: 'Shopee', slug: 'shopee', type: 'SCRAPING' as const, scheduleMinutes: 5 },
  { name: 'Pelando', slug: 'pelando', type: 'SCRAPING' as const, scheduleMinutes: 2 },
  { name: 'Promobit', slug: 'promobit', type: 'SCRAPING' as const, scheduleMinutes: 2 },
];

async function main() {
  for (const source of sources) {
    await prisma.source.upsert({
      where: { slug: source.slug },
      create: source,
      update: { name: source.name, type: source.type, scheduleMinutes: source.scheduleMinutes },
    });
  }
  console.log(`Seed concluído: ${sources.length} fontes cadastradas`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
