import type { OfferValidator, ValidationResult } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

/** Mesma lógica do RatingValidator: se a fonte não expõe contagem de
 * avaliações, o filtro não se aplica em vez de rejeitar por padrão. */
export class ReviewsCountValidator implements OfferValidator {
  readonly name = 'ReviewsCountValidator';

  constructor(private readonly minReviewsCount: number) {}

  validate(offer: RawOffer): ValidationResult {
    if (offer.reviewsCount === undefined) {
      return { valid: true };
    }
    if (offer.reviewsCount < this.minReviewsCount) {
      return {
        valid: false,
        reason: `${offer.reviewsCount} avaliações, abaixo do mínimo (${this.minReviewsCount})`,
      };
    }
    return { valid: true };
  }
}
