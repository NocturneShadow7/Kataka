import { useState, useEffect } from 'react';
import { Smartphone, Shield, Zap, Users, BarChart, ArrowRight, ShoppingCart, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PageAccueilProps {
  onConnexion: () => void;
  onBoutique?: () => void;
  onContact?: () => void;
}

interface HomepageContent {
  [section: string]: {
    [key: string]: string;
  };
}

export function PageAccueil({ onConnexion, onBoutique, onContact }: PageAccueilProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<HomepageContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerContenu();
  }, []);

  const chargerContenu = async () => {
    const { data } = await supabase
      .from('homepage_content')
      .select('*');

    if (data) {
      const grouped: HomepageContent = {};
      data.forEach(item => {
        if (!grouped[item.section]) {
          grouped[item.section] = {};
        }
        grouped[item.section][item.key] = item.value;
      });
      setContent(grouped);
    }
    setLoading(false);
  };

  const getContent = (section: string, key: string, defaultValue: string = ''): string => {
    return content[section]?.[key] || defaultValue;
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Shield,
      Zap,
      Users,
      BarChart
    };
    return icons[iconName] || Shield;
  };

  const texteBouton = user ? 'Dashboard' : 'Connexion';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="fixed w-full top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              <span className="text-lg md:text-xl font-bold text-white">Interkom SIM</span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              {onContact && (
                <button
                  onClick={onContact}
                  className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  <Mail className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Contact</span>
                </button>
              )}
              {onBoutique && (
                <button
                  onClick={onBoutique}
                  className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Boutique</span>
                </button>
              )}
              <button
                onClick={onConnexion}
                className="px-3 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 text-sm md:text-base"
              >
                {texteBouton}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight px-4">
              {getContent('hero', 'title', 'Gérez vos cartes SIM professionnelles en toute simplicité')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
              {getContent('hero', 'subtitle', 'Solution complète pour la gestion de vos cartes SIM d\'entreprise avec Interkom')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {onBoutique && (
                <button
                  onClick={onBoutique}
                  className="group px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 text-lg font-semibold"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{getContent('hero', 'cta_secondary', 'Voir la boutique')}</span>
                </button>
              )}
              <button
                onClick={onConnexion}
                className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 text-lg font-semibold shadow-lg shadow-blue-500/30"
              >
                <span>{user ? 'Aller au Dashboard' : getContent('hero', 'cta_primary', 'Commencer maintenant')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-400">
                {getContent('stats', 'stat1_number', '500+')}
              </div>
              <div className="text-gray-300">
                {getContent('stats', 'stat1_label', 'Cartes SIM gérées')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-400">
                {getContent('stats', 'stat2_number', '99.9%')}
              </div>
              <div className="text-gray-300">
                {getContent('stats', 'stat2_label', 'Disponibilité')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-blue-400">
                {getContent('stats', 'stat3_number', '24/7')}
              </div>
              <div className="text-gray-300">
                {getContent('stats', 'stat3_label', 'Support technique')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {['feature1', 'feature2', 'feature3', 'feature4'].map((featureKey) => {
              const IconComponent = getIconComponent(getContent(featureKey, 'icon', 'Shield'));
              return (
                <div
                  key={featureKey}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {getContent(featureKey, 'title', 'Fonctionnalité')}
                  </h3>
                  <p className="text-gray-300">
                    {getContent(featureKey, 'description', 'Description de la fonctionnalité')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/20 to-cyan-900/20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            {getContent('cta', 'title', 'Prêt à commencer ?')}
          </h2>
          <p className="text-xl text-gray-300">
            {getContent('cta', 'description', 'Rejoignez des centaines d\'entreprises qui font confiance à Interkom')}
          </p>
          {onContact && (
            <button
              onClick={onContact}
              className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 text-lg font-semibold mx-auto shadow-lg shadow-blue-500/30"
            >
              <span>{getContent('cta', 'button_text', 'Créer un compte')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </section>

      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Interkom SIM</span>
            </div>
            <p className="text-gray-400 text-sm">
              {getContent('footer', 'description', 'La solution de gestion de cartes SIM pour les professionnels')}
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            {getContent('footer', 'copyright', '© 2024 Interkom. Tous droits réservés.')}
          </div>
        </div>
      </footer>
    </div>
  );
}
