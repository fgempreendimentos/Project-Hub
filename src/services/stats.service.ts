import type { StatsRepository } from '../database/repositories/stats.repository';

export type Overview = {
  totalOffers: number;
  sentOffers: number;
  rejectedOffers: number;
  errors: number;
  sourcesOnline: number;
  sourcesOffline: number;
};

export type TimeseriesPoint = { label: string; count: number };
export type Granularity = 'daily' | 'weekly' | 'monthly';

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUTCWeek(date: Date): Date {
  const day = startOfUTCDay(date);
  const weekday = (day.getUTCDay() + 6) % 7; // segunda-feira = 0
  day.setUTCDate(day.getUTCDate() - weekday);
  return day;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

type Range = { since: Date; keys: string[]; keyFor: (date: Date) => string };

/** Gera o range de buckets (com zeros preenchidos) e a função que mapeia uma
 * data para a chave do bucket correspondente. */
function buildRange(granularity: Granularity): Range {
  const now = new Date();

  if (granularity === 'daily') {
    const days = 30;
    const today = startOfUTCDay(now);
    const keys = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      return toDateKey(d);
    });
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    return { since, keys, keyFor: (date) => toDateKey(startOfUTCDay(date)) };
  }

  if (granularity === 'weekly') {
    const weeks = 12;
    const thisWeek = startOfUTCWeek(now);
    const keys = Array.from({ length: weeks }, (_, i) => {
      const d = new Date(thisWeek);
      d.setUTCDate(d.getUTCDate() - (weeks - 1 - i) * 7);
      return toDateKey(d);
    });
    const since = new Date(thisWeek);
    since.setUTCDate(since.getUTCDate() - (weeks - 1) * 7);
    return { since, keys, keyFor: (date) => toDateKey(startOfUTCWeek(date)) };
  }

  const months = 12;
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    return toMonthKey(d);
  });
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return { since, keys, keyFor: (date) => toMonthKey(date) };
}

export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  async overview(): Promise<Overview> {
    const [byStatus, errors, sources] = await Promise.all([
      this.statsRepository.countOffersByStatus(),
      this.statsRepository.countErrors(),
      this.statsRepository.countSourcesByStatus(),
    ]);

    const sentOffers = byStatus.SENT ?? 0;
    const rejectedOffers = byStatus.REJECTED ?? 0;
    const approvedOffers = byStatus.APPROVED ?? 0;

    return {
      totalOffers: sentOffers + rejectedOffers + approvedOffers,
      sentOffers,
      rejectedOffers,
      errors,
      sourcesOnline: sources.online,
      sourcesOffline: sources.offline,
    };
  }

  clicksByAffiliate() {
    return this.statsRepository.clicksByPlatform();
  }

  topProducts(limit = 10) {
    return this.statsRepository.topProducts(limit);
  }

  async timeseries(granularity: Granularity): Promise<TimeseriesPoint[]> {
    const range = buildRange(granularity);
    const dates = await this.statsRepository.sentOffersSince(range.since);

    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = range.keyFor(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return range.keys.map((label) => ({ label, count: counts.get(label) ?? 0 }));
  }
}
