import { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface SecureAccessProps {
  onValidCode: () => void;
  expectedCode: string;
}

export function SecureAccess({ onValidCode, expectedCode }: SecureAccessProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ a: 0, b: 0 });
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    genererCaptcha();
  }, []);

  const genererCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ a, b });
    setCaptchaValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const reponseAttendue = captchaQuestion.a + captchaQuestion.b;
    if (parseInt(captchaValue) !== reponseAttendue) {
      setError('Captcha incorrect');
      genererCaptcha();
      return;
    }

    if (code === expectedCode) {
      sessionStorage.setItem('secure_access_granted', 'true');
      onValidCode();
    } else {
      setAttempts(prev => prev + 1);
      setError('Code incorrect');
      setCode('');
      genererCaptcha();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6 mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/20 rounded-full">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Accès Sécurisé
          </h1>

          <p className="text-gray-300">
            Cette application est en mode sécurisé. Veuillez entrer le code d'accès pour continuer.
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Code d'accès
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
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Entrez le code"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Vérification anti-bruteforce
            </label>
            <div className="flex items-center space-x-3 mb-3">
              <Shield className="w-5 h-5 text-blue-400" />
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
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre réponse"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Valider
          </button>
        </form>
      </div>
    </div>
  );
}
