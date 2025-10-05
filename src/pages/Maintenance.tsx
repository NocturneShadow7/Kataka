import { useState, useEffect } from 'react';
import { Wrench, Lock, Shield, AlertTriangle } from 'lucide-react';

interface MaintenanceProps {
  message?: string;
  adminCode?: string;
  onAdminAccess?: () => void;
}

export function Maintenance({ message, adminCode, onAdminAccess }: MaintenanceProps) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [code, setCode] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ a: 0, b: 0 });
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (showAdminForm) {
      genererCaptcha();
    }
  }, [showAdminForm]);

  const genererCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ a, b });
    setCaptchaValue('');
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const reponseAttendue = captchaQuestion.a + captchaQuestion.b;
    if (parseInt(captchaValue) !== reponseAttendue) {
      setError('Captcha incorrect');
      genererCaptcha();
      return;
    }

    if (code === adminCode) {
      sessionStorage.setItem('maintenance_admin_access', 'true');
      if (onAdminAccess) {
        onAdminAccess();
      }
    } else {
      setAttempts(prev => prev + 1);
      setError('Code incorrect');
      setCode('');
      genererCaptcha();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-orange-600/20 rounded-full mb-6">
          <Wrench className="w-12 h-12 text-orange-400 animate-pulse" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Maintenance en cours
        </h1>

        <p className="text-xl text-gray-300">
          {message || 'Nous effectuons actuellement une maintenance sur notre plateforme pour améliorer votre expérience.'}
        </p>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-400">
            Nous serons de retour très bientôt. Merci pour votre patience !
          </p>
        </div>

        {!showAdminForm ? (
          <button
            onClick={() => setShowAdminForm(true)}
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Accès administrateur
          </button>
        ) : (
          <div className="max-w-md mx-auto">
            {attempts > 0 && (
              <div className="mb-4 bg-orange-900/20 border border-orange-700 rounded-lg p-4 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 text-sm">
                    {attempts} tentative{attempts > 1 ? 's' : ''} échouée{attempts > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Code administrateur
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Entrez le code admin"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Vérification anti-bruteforce
                </label>
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <span className="text-white text-lg font-mono">
                    {captchaQuestion.a} + {captchaQuestion.b} = ?
                  </span>
                </div>
                <input
                  type="number"
                  value={captchaValue}
                  onChange={(e) => {
                    setCaptchaValue(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Votre réponse"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminForm(false);
                    setCode('');
                    setCaptchaValue('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
