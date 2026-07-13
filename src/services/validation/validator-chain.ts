import type { OfferValidator, ValidationContext } from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

export type ValidatorChainResult =
  { approved: true } | { approved: false; rejectedBy: string; reason: string };

/** Executa os validadores em ordem e para no primeiro que rejeitar
 * (Chain of Responsibility / Strategy). */
export class ValidatorChain {
  constructor(private readonly validators: OfferValidator[]) {}

  run(offer: RawOffer, context: ValidationContext): ValidatorChainResult {
    for (const validator of this.validators) {
      const result = validator.validate(offer, context);
      if (!result.valid) {
        return { approved: false, rejectedBy: validator.name, reason: result.reason };
      }
    }
    return { approved: true };
  }
}
