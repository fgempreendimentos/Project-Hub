import type { OfferValidator, ValidationResult } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

/** Fontes que não expõem avaliação por produto (ex.: agregadores de cupom
 * como Pelando/Promobit, que usam "temperatura" da comunidade em vez de
 * estrelas) simplesmente não preenchem `rating` — nesse caso o filtro não
 * se aplica, em vez de rejeitar por falta de um dado que a fonte não tem. */
export class RatingValidator implements OfferValidator {
  readonly name = 'RatingValidator';

  constructor(private readonly minRating: number) {}

  validate(offer: RawOffer): ValidationResult {
    if (offer.rating === undefined) {
      return { valid: true };
    }
    if (offer.rating < this.minRating) {
      return {
        valid: false,
        reason: `Avaliação ${offer.rating} abaixo do mínimo (${this.minRating})`,
      };
    }
    return { valid: true };
  }
}
