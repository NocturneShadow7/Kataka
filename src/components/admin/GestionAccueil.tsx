import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Home, Save, RotateCcw } from 'lucide-react';

interface HomepageContent {
  id: string;
  section: string;
  key: string;
  value: string;
  type: string;
  updated_at: string;
}

interface ContentGroup {
  [section: string]: {
    [key: string]: HomepageContent;
  };
}

export function GestionAccueil() {
  const [contents, setContents] = useState<HomepageContent[]>([]);
  const [groupedContents, setGroupedContents] = useState<ContentGroup>({});
  const [editedValues, setEditedValues] = useState<{ [id: string]: string }>({});
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    chargerContenu();
  }, []);

  const chargerContenu = async () => {
    const { data, error } = await supabase
      .from('homepage_content')
      .select('*')
      .order('section', { ascending: true });

    if (!error && data) {
      setContents(data);

      const grouped: ContentGroup = {};
      data.forEach(item => {
        if (!grouped[item.section]) {
          grouped[item.section] = {};
        }
        grouped[item.section][item.key] = item;
      });
      setGroupedContents(grouped);

      const initialValues: { [id: string]: string } = {};
      data.forEach(item => {
        initialValues[item.id] = item.value;
      });
      setEditedValues(initialValues);
    }
    setChargement(false);
  };

  const sauvegarderTout = async () => {
    setSauvegarde(true);

    const updates = contents
      .filter(item => editedValues[item.id] !== item.value)
      .map(item => ({
        id: item.id,
        value: editedValues[item.id]
      }));

    for (const update of updates) {
      await supabase
        .from('homepage_content')
        .update({ value: update.value })
        .eq('id', update.id);
    }

    await chargerContenu();
    setSauvegarde(false);
    alert('Contenu sauvegardé avec succès !');
  };

  const reinitialiser = () => {
    const initialValues: { [id: string]: string } = {};
    contents.forEach(item => {
      initialValues[item.id] = item.value;
    });
    setEditedValues(initialValues);
  };

  const getSectionTitle = (section: string): string => {
    const titles: { [key: string]: string } = {
      hero: 'Section Principale (Hero)',
      stats: 'Statistiques',
      feature1: 'Fonctionnalité 1',
      feature2: 'Fonctionnalité 2',
      feature3: 'Fonctionnalité 3',
      feature4: 'Fonctionnalité 4',
      cta: 'Appel à l\'action',
      footer: 'Pied de page'
    };
    return titles[section] || section;
  };

  const getKeyLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      title: 'Titre',
      subtitle: 'Sous-titre',
      description: 'Description',
      cta_primary: 'Bouton principal',
      cta_secondary: 'Bouton secondaire',
      background_image: 'Image de fond (URL)',
      stat1_number: 'Statistique 1 - Nombre',
      stat1_label: 'Statistique 1 - Label',
      stat2_number: 'Statistique 2 - Nombre',
      stat2_label: 'Statistique 2 - Label',
      stat3_number: 'Statistique 3 - Nombre',
      stat3_label: 'Statistique 3 - Label',
      icon: 'Icône',
      button_text: 'Texte du bouton',
      copyright: 'Copyright'
    };
    return labels[key] || key;
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Home className="w-6 h-6" />
            <span>Gestion de la Page d'Accueil</span>
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Modifiez tout le contenu texte de votre page d'accueil
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={reinitialiser}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Réinitialiser</span>
          </button>
          <button
            onClick={sauvegarderTout}
            disabled={sauvegarde}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{sauvegarde ? 'Sauvegarde...' : 'Sauvegarder tout'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedContents).map(section => (
          <div key={section} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 px-6 py-4 border-b border-gray-700">
              <h4 className="text-lg font-semibold text-white">{getSectionTitle(section)}</h4>
            </div>

            <div className="p-6 space-y-4">
              {Object.keys(groupedContents[section]).map(key => {
                const item = groupedContents[section][key];
                const isTextarea = ['description', 'content', 'subtitle'].some(k => key.includes(k));

                return (
                  <div key={item.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getKeyLabel(key)}
                      <span className="text-xs text-gray-500 ml-2">({key})</span>
                    </label>
                    {isTextarea ? (
                      <textarea
                        value={editedValues[item.id] || ''}
                        onChange={(e) => setEditedValues({ ...editedValues, [item.id]: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedValues[item.id] || ''}
                        onChange={(e) => setEditedValues({ ...editedValues, [item.id]: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                    {item.value !== editedValues[item.id] && (
                      <div className="mt-1 text-xs text-yellow-400">Modifié (non sauvegardé)</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
        <h4 className="text-white font-semibold mb-2">💡 Astuce</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Les icônes disponibles : Shield, Zap, Users, BarChart, TrendingUp, etc.</li>
          <li>• Les modifications ne sont appliquées qu'après avoir cliqué sur "Sauvegarder tout"</li>
          <li>• Utilisez "Réinitialiser" pour annuler toutes les modifications non sauvegardées</li>
          <li>• Les URLs d'images doivent commencer par https://</li>
        </ul>
      </div>
    </div>
  );
}
