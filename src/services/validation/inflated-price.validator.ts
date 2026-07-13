import type {
  OfferValidator,
  ValidationContext,
  ValidationResult,
} from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

/** Detecta quando o preço "de" foi inflado artificialmente pouco antes do
 * "desconto", comparando com a média histórica real do produto. */
export class InflatedPriceValidator implements OfferValidator {
  readonly name = 'InflatedPriceValidator';

  constructor(private readonly toleranceP: number) {}

  validate(offer: RawOffer, context: ValidationContext): ValidationResult {
    if (context.historicalAveragePrice === null) {
      return { valid: true };
    }

    const maxPlausibleOriginal = context.historicalAveragePrice * (1 + this.toleranceP / 100);

    if (offer.originalPrice > maxPlausibleOriginal) {
      return {
        valid: false,
        reason: `Preço "de" (R$ ${offer.originalPrice}) muito acima da média histórica (R$ ${context.historicalAveragePrice.toFixed(2)})`,
      };
    }

    return { valid: true };
  }
}
