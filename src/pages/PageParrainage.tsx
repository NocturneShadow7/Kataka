import { useState } from 'react';
import { Gift, ArrowRight, Check, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { supabase } from '../lib/supabase';

interface PageParrainageProps {
  onNavigate?: (page: 'home' | 'login' | 'contact') => void;
  onCodeValide?: (code: string, discount: number) => void;
}

export function PageParrainage({ onNavigate, onCodeValide }: PageParrainageProps) {
  const [code, setCode] = useState('');
  const [verification, setVerification] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [codeDetails, setCodeDetails] = useState<{
    code_type: 'trusted' | 'lowcost';
    discount: number;
  } | null>(null);

  const verifierCode = async () => {
    if (!code.trim()) return;

    setVerification('checking');

    const { data, error } = await supabase
      .from('referral_codes')
      .select('code, code_type, is_active, user_id')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      setVerification('invalid');
      return;
    }

    const discount = data.code_type === 'trusted' ? 2.99 : 2.00;

    setCodeDetails({
      code_type: data.code_type,
      discount
    });
    setVerification('valid');
  };

  const continuerAvecCode = () => {
    if (codeDetails && onCodeValide) {
      onCodeValide(code.toUpperCase().trim(), codeDetails.discount);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar currentPage="home" onNavigate={onNavigate} />

      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Code de Parrainage
          </h1>
          <p className="text-xl text-gray-300">
            Bénéficiez d'une réduction sur votre inscription
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 max-w-2xl mx-auto">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Entrez votre code de parrainage
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setVerification('idle');
                  setCodeDetails(null);
                }}
                className="flex-1 px-6 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white text-lg font-mono uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABCD1234"
                maxLength={8}
              />
              <button
                onClick={verifierCode}
                disabled={!code.trim() || verification === 'checking'}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {verification === 'checking' ? 'Vérification...' : 'Vérifier'}
              </button>
            </div>
          </div>

          {verification === 'invalid' && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 flex items-start space-x-3">
              <X className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-300 font-semibold mb-1">Code invalide</h4>
                <p className="text-sm text-red-200">
                  Ce code n'existe pas ou n'est plus actif. Vérifiez votre code ou contactez la personne qui vous l'a fourni.
                </p>
              </div>
            </div>
          )}

          {verification === 'valid' && codeDetails && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3 mb-4">
                <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-green-300 font-semibold mb-1">Code valide !</h4>
                  <p className="text-sm text-green-200 mb-4">
                    Vous bénéficiez d'une réduction sur votre inscription.
                  </p>

                  <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Prix normal :</span>
                      <span className="text-gray-300 line-through">2.99€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Réduction :</span>
                      <span className="text-green-400 font-semibold">-{codeDetails.discount.toFixed(2)}€</span>
                    </div>
                    <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                      <span className="text-white font-semibold">Prix final :</span>
                      <span className="text-2xl font-bold text-green-400">
                        {(2.99 - codeDetails.discount).toFixed(2)}€
                      </span>
                    </div>
                  </div>

                  {codeDetails.code_type === 'trusted' && (
                    <div className="mt-4 bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <p className="text-sm text-blue-200 font-medium">
                        🎉 Inscription GRATUITE - Code de membre de confiance
                      </p>
                    </div>
                  )}
                  {codeDetails.code_type === 'lowcost' && (
                    <div className="mt-4 bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                      <p className="text-sm text-purple-200 font-medium">
                        💰 Inscription à prix réduit - 0.99€ seulement
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={continuerAvecCode}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-colors font-semibold text-lg"
              >
                <span>Continuer avec ce code</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="border-t border-gray-700 pt-6 mt-6">
            <button
              onClick={() => onNavigate?.('contact')}
              className="w-full text-center text-gray-400 hover:text-white transition-colors"
            >
              Je n'ai pas de code - Continuer sans code (2.99€)
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Code Trusted</h3>
            <p className="text-sm text-gray-400">Inscription 100% gratuite</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Code Low-Cost</h3>
            <p className="text-sm text-gray-400">Inscription à 0.99€</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Sans Code</h3>
            <p className="text-sm text-gray-400">Inscription à 2.99€</p>
          </div>
        </div>
      </div>
    </div>
  );
}
