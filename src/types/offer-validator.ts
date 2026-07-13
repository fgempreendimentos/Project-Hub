import type { RawOffer } from './raw-offer';

/** Contexto adicional que um validador pode precisar além do próprio RawOffer. */
export type ValidationContext = {
  historicalAveragePrice: number | null;
  isDuplicate: boolean;
};

export type ValidationResult = { valid: true } | { valid: false; reason: string };

/** Uma regra de rejeição isolada (SRP): cada validador testa uma coisa e só uma. */
export interface OfferValidator {
  readonly name: string;
  validate(offer: RawOffer, context: ValidationContext): ValidationResult;
}
