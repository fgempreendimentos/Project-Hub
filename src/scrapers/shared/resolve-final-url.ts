import { httpClient } from './http-client';

/** Agregadores de cupom costumam usar link de redirecionamento próprio;
 * resolve para a URL final da loja antes da conversão de afiliado. */
export async function resolveFinalUrl(url: string): Promise<string> {
  try {
    const response = await httpClient.get(url, { maxRedirects: 5 });
    return response.request?.res?.responseUrl ?? url;
  } catch {
    return url;
  }
}
