import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/** Amazon Associates: tag de afiliado via query param `tag=`. Mecanismo
 * estável e documentado publicamente pelo programa. */
export class AmazonLinkConverter implements AffiliateLinkConverter {
  readonly platform = 'amazon';

  constructor(private readonly affiliateTag: string) {}

  matches(url: string): boolean {
    return /amazon\.com\.br|amzn\.to/i.test(url);
  }

  convert(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tag=${this.affiliateTag}`;
  }
}
