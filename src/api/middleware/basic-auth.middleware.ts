import type { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env';

/**
 * HTTP Basic Auth simples para o dashboard/API de estatísticas. Fica
 * desativado se DASHBOARD_USER/DASHBOARD_PASSWORD não forem configurados
 * (conveniente em desenvolvimento) — em produção, configure ambos.
 */
export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.dashboard.user || !env.dashboard.password) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (header?.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const user = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (user === env.dashboard.user && password === env.dashboard.password) {
      next();
      return;
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Dashboard"');
  res.status(401).send('Autenticação necessária');
}
