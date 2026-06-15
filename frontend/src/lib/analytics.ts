import * as amplitude from '@amplitude/analytics-browser';

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';

// LGPD (art. 8): cookies/rastreamento analítico só após consentimento do titular.
export const COOKIE_CONSENT_KEY = 'lgpd_cookie_consent';

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
}

export function initAmplitude() {
  if (!API_KEY || typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return; // sem consentimento, não inicializa rastreamento
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
  | 'platform_user_logged_in'
  | 'platform_impersonate'
  | 'user_logged_out'
  | 'page_viewed'
  | 'lead_criado'
  | 'lead_visualizado'
  | 'negocio_criado'
  | 'empresa_criada'
  | 'inspecao_iniciada'
  | 'projeto_visualizado'
  | 'contrato_amc_visualizado';
