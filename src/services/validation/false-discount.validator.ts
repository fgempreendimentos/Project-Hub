import type { OfferValidator, ValidationResult } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

/** Confere se o desconto anunciado bate com a matemática real dos preços,
 * pegando anúncios de "super desconto" que na prática não descontam nada. */
export class FalseDiscountValidator implements OfferValidator {
  readonly name = 'FalseDiscountValidator';

  constructor(private readonly toleranceP: number) {}

  validate(offer: RawOffer): ValidationResult {
    if (offer.originalPrice <= 0) {
      return { valid: false, reason: 'Preço original inválido' };
    }

    const realDiscount = ((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100;

    if (realDiscount <= 0) {
      return { valid: false, reason: 'Preço da oferta não é menor que o preço original' };
    }

    if (Math.abs(realDiscount - offer.discountPercent) > this.toleranceP) {
      return {
        valid: false,
        reason: `Desconto anunciado (${offer.discountPercent}%) não confere com o real (${realDiscount.toFixed(1)}%)`,
      };
    }

    return { valid: true };
  }
}
