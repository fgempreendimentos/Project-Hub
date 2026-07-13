import type { PrismaClient } from '../../generated/prisma/client';

export class LogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  record(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: string) {
    return this.prisma.log.create({ data: { level, message, context } });
  }
}
