import * as amplitude from '@amplitude/analytics-browser';

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';

export function initAmplitude() {
  if (!API_KEY || typeof window === 'undefined') return;
  amplitude.init(API_KEY, {
    defaultTracking: { sessions: true, pageViews: false, formInteractions: false, fileDownloads: false },
    autocapture: false,
  });
}

export function identifyUser(userId: string, properties: Record<string, string | number | boolean>) {
  if (!API_KEY || typeof window === 'undefined') return;
  amplitude.setUserId(userId);
  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => identify.set(key, value));
  amplitude.identify(identify);
}

export function resetAnalytics() {
  if (!API_KEY || typeof window === 'undefined') return;
  amplitude.reset();
}

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!API_KEY || typeof window === 'undefined') return;
  amplitude.track(event, properties);
}

export type AnalyticsEvent =
  | 'user_logged_in'
  | 'user_logged_out'
  | 'page_viewed'
  | 'lead_criado'
  | 'lead_visualizado'
  | 'negocio_criado'
  | 'empresa_criada'
  | 'inspecao_iniciada'
  | 'projeto_visualizado'
  | 'contrato_amc_visualizado';
