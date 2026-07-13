import type { OfferValidator, ValidationResult } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

/** Cobre tanto "produto indisponível" quanto "promoção encerrada": nas fontes,
 * ambos os casos chegam como o mesmo sinal (`available: false`). */
export class AvailabilityValidator implements OfferValidator {
  readonly name = 'AvailabilityValidator';

  validate(offer: RawOffer): ValidationResult {
    if (!offer.available) {
      return { valid: false, reason: 'Produto indisponível ou promoção encerrada' };
    }
    return { valid: true };
  }
}
