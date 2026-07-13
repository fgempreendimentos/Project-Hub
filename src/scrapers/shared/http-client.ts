import axios from 'axios';

/** Cliente HTTP compartilhado com um User-Agent de navegador real — a maioria
 * das lojas bloqueia requisições sem isso. */
export const httpClient = axios.create({
  timeout: 15_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
});
