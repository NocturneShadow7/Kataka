import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Shield, Wrench, Eye, EyeOff } from 'lucide-react';

interface SiteSettings {
  maintenance_mode: { enabled: boolean };
  secure_mode: { enabled: boolean; code: string };
  captcha_enabled: { enabled: boolean };
}

export function GestionParametres() {
  const [settings, setSettings] = useState<SiteSettings>({
    maintenance_mode: { enabled: false },
    secure_mode: { enabled: false, code: '' },
    captcha_enabled: { enabled: false }
  });
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [afficherCode, setAfficherCode] = useState(false);

  useEffect(() => {
    chargerParametres();
  }, []);

  const chargerParametres = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*');

    if (!error && data) {
      const parametres: any = {};
      data.forEach((setting) => {
        parametres[setting.key] = setting.value;
      });
      setSettings({
        maintenance_mode: parametres.maintenance_mode || { enabled: false },
        secure_mode: parametres.secure_mode || { enabled: false, code: '' },
        captcha_enabled: parametres.captcha_enabled || { enabled: false }
      });
    }
    setChargement(false);
  };

  const sauvegarderParametre = async (key: string, value: any) => {
    const { error } = await supabase
      .from('site_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
      return false;
    }
    return true;
  };

  const basculerMaintenance = async () => {
    const nouveauStatut = !settings.maintenance_mode.enabled;
    const nouveauParametre = { enabled: nouveauStatut };

    if (await sauvegarderParametre('maintenance_mode', nouveauParametre)) {
      setSettings({ ...settings, maintenance_mode: nouveauParametre });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 2000);
    }
  };

  const basculerCaptcha = async () => {
    const nouveauStatut = !settings.captcha_enabled.enabled;
    const nouveauParametre = { enabled: nouveauStatut };

    if (await sauvegarderParametre('captcha_enabled', nouveauParametre)) {
      setSettings({ ...settings, captcha_enabled: nouveauParametre });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 2000);
    }
  };

  const basculerModeSecurise = async () => {
    const nouveauStatut = !settings.secure_mode.enabled;
    const nouveauParametre = {
      enabled: nouveauStatut,
      code: settings.secure_mode.code
    };

    if (await sauvegarderParametre('secure_mode', nouveauParametre)) {
      setSettings({ ...settings, secure_mode: nouveauParametre });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 2000);
    }
  };

  const modifierCode = async (nouveauCode: string) => {
    const nouveauParametre = {
      enabled: settings.secure_mode.enabled,
      code: nouveauCode
    };

    if (await sauvegarderParametre('secure_mode', nouveauParametre)) {
      setSettings({ ...settings, secure_mode: nouveauParametre });
      setSauvegarde(true);
      setTimeout(() => setSauvegarde(false), 2000);
    }
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Settings className="w-6 h-6" />
            <span>Paramètres du site</span>
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Gérez les options de sécurité et d'accès
          </p>
        </div>
        {sauvegarde && (
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Sauvegardé</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-orange-900/30 rounded-lg">
                <Wrench className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-2">Mode Maintenance</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Lorsqu'activé, seuls les administrateurs peuvent accéder au site. Les autres utilisateurs verront un message de maintenance.
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={basculerMaintenance}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.maintenance_mode.enabled ? 'bg-orange-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.maintenance_mode.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-300">
                    {settings.maintenance_mode.enabled ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-900/30 rounded-lg">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-2">Mode Sécurisé</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Lorsqu'activé, un code d'accès est requis pour entrer sur le site. Les administrateurs peuvent toujours accéder sans code.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={basculerModeSecurise}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.secure_mode.enabled ? 'bg-red-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.secure_mode.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-300">
                      {settings.secure_mode.enabled ? 'Activé' : 'Désactivé'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Code d'accès
                    </label>
                    <div className="relative">
                      <input
                        type={afficherCode ? 'text' : 'password'}
                        value={settings.secure_mode.code}
                        onChange={(e) => {
                          const nouveauSettings = { ...settings };
                          nouveauSettings.secure_mode.code = e.target.value;
                          setSettings(nouveauSettings);
                        }}
                        onBlur={(e) => modifierCode(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                        placeholder="Définir un code d'accès"
                      />
                      <button
                        type="button"
                        onClick={() => setAfficherCode(!afficherCode)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {afficherCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Ce code sera demandé aux visiteurs pour accéder au site
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-900/30 rounded-lg">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-2">Captcha</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Activer la vérification Captcha lors de la connexion pour renforcer la sécurité.
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={basculerCaptcha}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.captcha_enabled.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.captcha_enabled.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-300">
                    {settings.captcha_enabled.enabled ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
