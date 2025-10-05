import { supabase } from './supabase';

export interface SiteSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  secure_mode: boolean;
  secure_code: string;
  captcha_enabled: boolean;
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  const { data } = await supabase
    .from('app_settings')
    .select('*');

  const settings: { [key: string]: string } = {};
  data?.forEach((setting) => {
    settings[setting.key] = setting.value;
  });

  return {
    maintenance_mode: settings['maintenance_mode'] === 'true',
    maintenance_message: settings['maintenance_message'] || 'Maintenance en cours. Nous reviendrons bientôt !',
    secure_mode: settings['secure_mode'] === 'true',
    secure_code: settings['secure_code'] || '',
    captcha_enabled: settings['captcha_enabled'] === 'true'
  };
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await loadSiteSettings();
  return settings.maintenance_mode;
}

export async function isSecureMode(): Promise<{ enabled: boolean; code: string }> {
  const settings = await loadSiteSettings();
  return { enabled: settings.secure_mode, code: settings.secure_code };
}

export async function isCaptchaEnabled(): Promise<boolean> {
  const settings = await loadSiteSettings();
  return settings.captcha_enabled;
}
