import type {
  OfferValidator,
  ValidationContext,
  ValidationResult,
} from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

export class DuplicateValidator implements OfferValidator {
  readonly name = 'DuplicateValidator';

  validate(_offer: RawOffer, context: ValidationContext): ValidationResult {
    if (context.isDuplicate) {
      return { valid: false, reason: 'Oferta já enviada anteriormente (mesmo produto e preço)' };
    }
    return { valid: true };
  }
}
