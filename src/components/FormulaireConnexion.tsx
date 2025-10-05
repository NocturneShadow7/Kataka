import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { signIn } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from './Navbar';

interface FormulaireConnexionProps {
  onSuccess: () => void;
  onNavigate?: (page: 'home' | 'login' | 'contact') => void;
}

export function FormulaireConnexion({ onSuccess, onNavigate }: FormulaireConnexionProps) {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const { signIn: authSignIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    const { user, error: signInError } = await signIn(email, motDePasse);

    if (signInError || !user) {
      setErreur(signInError || 'Une erreur est survenue');
      setChargement(false);
      return;
    }

    await authSignIn(user);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar currentPage="login" onNavigate={onNavigate} />

      <div className="pt-20 px-4 pb-12 max-w-md mx-auto">
        <div className="text-center space-y-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Connexion
          </h1>
          <p className="text-gray-300">
            Accédez à votre espace personnel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6">
            {erreur && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <p className="text-sm text-red-200">{erreur}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={chargement}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chargement ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
