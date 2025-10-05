import { useState } from 'react';
import { Mail, User, Phone, MessageSquare, CreditCard } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { supabase } from '../lib/supabase';

interface ContactProps {
  onNavigate?: (page: 'home' | 'login' | 'contact') => void;
  codeParrainage?: { code: string; discount: number } | null;
}

export function Contact({ onNavigate, codeParrainage }: ContactProps) {
  const [formulaire, setFormulaire] = useState({
    full_name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    const { error } = await supabase
      .from('contact_requests')
      .insert({
        full_name: formulaire.full_name,
        email: formulaire.email,
        phone: formulaire.phone,
        message: formulaire.message,
        status: 'pending'
      });

    if (error) {
      setErreur('Erreur lors de l\'envoi de votre demande. Veuillez réessayer.');
      setChargement(false);
      return;
    }

    setSucces(true);
    setChargement(false);
    setFormulaire({ full_name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar currentPage="contact" onNavigate={onNavigate} />

      <div className="pt-20 px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Demande d'inscription
            </h1>
            <p className="text-xl text-gray-300">
              Rejoignez Interkom et profitez de nos services
            </p>
            {codeParrainage && (
              <div className="inline-block bg-green-900/30 border border-green-700 rounded-lg px-6 py-3">
                <p className="text-green-400 font-semibold">
                  Code de parrainage appliqué : {codeParrainage.discount.toFixed(2)}€ de réduction !
                </p>
              </div>
            )}
          </div>

          {succes ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Demande envoyée !</h3>
                <p className="text-gray-300">
                  Nous avons bien reçu votre demande d'inscription. Notre équipe va l'examiner et vous recevrez un email avec les prochaines étapes.
                </p>
              </div>

              <button
                onClick={() => setSucces(false)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Envoyer une nouvelle demande
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl border border-gray-700 p-6 md:p-8 space-y-6">
              {erreur && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                  <p className="text-sm text-red-200">{erreur}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formulaire.full_name}
                    onChange={(e) => setFormulaire({ ...formulaire, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre nom complet"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={formulaire.email}
                    onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={formulaire.phone}
                    onChange={(e) => setFormulaire({ ...formulaire, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+33 6 12 34 56 78"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message (optionnel)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <textarea
                    value={formulaire.message}
                    onChange={(e) => setFormulaire({ ...formulaire, message: e.target.value })}
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dites-nous en plus sur vos besoins..."
                  />
                </div>
              </div>

              <div className={`border rounded-lg p-4 ${
                codeParrainage
                  ? 'bg-green-900/30 border-green-700'
                  : 'bg-blue-900/30 border-blue-700'
              }`}>
                <div className="flex items-start space-x-3">
                  <CreditCard className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    codeParrainage ? 'text-green-400' : 'text-blue-400'
                  }`} />
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Frais d'inscription : {codeParrainage ? `${(2.99 - codeParrainage.discount).toFixed(2)}€` : '2.99€'}
                    </h4>
                    <p className="text-sm text-gray-300">
                      Une fois votre demande validée, vous recevrez un email avec les instructions de paiement.
                      {codeParrainage && codeParrainage.discount === 2.99
                        ? ' Votre inscription est totalement gratuite grâce au code de parrainage !'
                        : ' Ce montant unique permet de limiter les inscriptions abusives et garantit la qualité de notre service.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={chargement}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chargement ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
