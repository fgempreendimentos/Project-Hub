import type { OfferValidator, ValidationResult } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

export class DiscountThresholdValidator implements OfferValidator {
  readonly name = 'DiscountThresholdValidator';

  constructor(private readonly minDiscountPercent: number) {}

  validate(offer: RawOffer): ValidationResult {
    if (offer.discountPercent < this.minDiscountPercent) {
      return {
        valid: false,
        reason: `Desconto de ${offer.discountPercent}% abaixo do mínimo (${this.minDiscountPercent}%)`,
      };
    }
    return { valid: true };
  }
}
