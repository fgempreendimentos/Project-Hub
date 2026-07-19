import axios from 'axios';

import { httpClient } from './http-client';

/** Agregadores de cupom costumam usar link de redirecionamento próprio;
 * resolve para a URL final da loja antes da conversão de afiliado. Algumas
 * cadeias de redirecionamento de afiliado (ex.: Promobit → rede de afiliados
 * → loja) terminam num hop que responde com erro para requisições sem
 * navegador real, mesmo já tendo alcançado a URL final por 301/302 — nesses
 * casos o axios rejeita a promise, mas a URL final ainda fica registrada na
 * resposta do erro, então vale a pena checar antes de desistir. */
export async function resolveFinalUrl(url: string): Promise<string> {
  try {
    const response = await httpClient.get(url, { maxRedirects: 5 });
    return response.request?.res?.responseUrl ?? url;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const finalUrl = error.response?.request?.res?.responseUrl;
      if (finalUrl) {
        return finalUrl;
      }
    }
    return url;
  }
}
