import type { OfferValidator, ValidationResult } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

export class ShippingAbusiveValidator implements OfferValidator {
  readonly name = 'ShippingAbusiveValidator';

  constructor(private readonly maxShippingPercent: number) {}

  validate(offer: RawOffer): ValidationResult {
    if (!offer.shippingCost) {
      return { valid: true };
    }

    const shippingPercent = (offer.shippingCost / offer.offerPrice) * 100;
    if (shippingPercent > this.maxShippingPercent) {
      return {
        valid: false,
        reason: `Frete (R$ ${offer.shippingCost}) representa ${shippingPercent.toFixed(1)}% do preço, acima do limite (${this.maxShippingPercent}%)`,
      };
    }

    return { valid: true };
  }
}
