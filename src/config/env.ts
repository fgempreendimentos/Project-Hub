import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '3000')),
  logLevel: required('LOG_LEVEL', 'info'),
  publicBaseUrl: required('PUBLIC_BASE_URL', 'http://localhost:3000'),
  dashboard: {
    user: required('DASHBOARD_USER', ''),
    password: required('DASHBOARD_PASSWORD', ''),
  },
  whatsapp: {
    authDir: required('WHATSAPP_AUTH_DIR', './auth'),
    groupId: required('WHATSAPP_GROUP_ID', ''),
    minIntervalMs: Number(required('WHATSAPP_MIN_INTERVAL_MS', '20000')),
  },
  affiliate: {
    amazon: required('AFFILIATE_AMAZON', ''),
    shopee: required('AFFILIATE_SHOPEE', ''),
    mercadolivre: required('AFFILIATE_MERCADOLIVRE', ''),
  },
  validation: {
    minDiscountPercent: Number(required('MIN_DISCOUNT_PERCENT', '20')),
    minRating: Number(required('MIN_RATING', '4')),
    minReviewsCount: Number(required('MIN_REVIEWS_COUNT', '50')),
    falseDiscountToleranceP: Number(required('FALSE_DISCOUNT_TOLERANCE_PERCENT', '3')),
    inflatedPriceToleranceP: Number(required('INFLATED_PRICE_TOLERANCE_PERCENT', '30')),
    maxShippingPercent: Number(required('MAX_SHIPPING_PERCENT', '20')),
  },
  schedule: {
    amazonMinutes: Number(required('SCHEDULE_AMAZON_MINUTES', '5')),
    mercadolivreMinutes: Number(required('SCHEDULE_MERCADOLIVRE_MINUTES', '5')),
    shopeeMinutes: Number(required('SCHEDULE_SHOPEE_MINUTES', '5')),
    pelandoMinutes: Number(required('SCHEDULE_PELANDO_MINUTES', '2')),
    promobitMinutes: Number(required('SCHEDULE_PROMOBIT_MINUTES', '2')),
  },
};
