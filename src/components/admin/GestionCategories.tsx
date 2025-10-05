import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, X, Tag } from 'lucide-react';

interface Categorie {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export function GestionCategories() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [categorieEnEdition, setCategorieEnEdition] = useState<Categorie | null>(null);
  const [formulaire, setFormulaire] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    chargerCategories();
  }, []);

  const chargerCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCategories(data);
    }
    setChargement(false);
  };

  const ouvrirModale = (categorie?: Categorie) => {
    if (categorie) {
      setCategorieEnEdition(categorie);
      setFormulaire({
        name: categorie.name,
        description: categorie.description || ''
      });
    } else {
      setCategorieEnEdition(null);
      setFormulaire({
        name: '',
        description: ''
      });
    }
    setModaleOuverte(true);
  };

  const fermerModale = () => {
    setModaleOuverte(false);
    setCategorieEnEdition(null);
  };

  const sauvegarder = async () => {
    if (!formulaire.name) {
      alert('Veuillez remplir le nom de la catégorie');
      return;
    }

    const donnees = {
      name: formulaire.name,
      description: formulaire.description || null
    };

    if (categorieEnEdition) {
      const { error } = await supabase.from('categories').update(donnees).eq('id', categorieEnEdition.id);
      if (error) {
        alert('Erreur lors de la modification: ' + error.message);
        return;
      }
      alert('Catégorie modifiée avec succès');
    } else {
      const { error } = await supabase.from('categories').insert(donnees);
      if (error) {
        alert('Erreur lors de la création: ' + error.message);
        return;
      }
      alert('Catégorie créée avec succès');
    }

    fermerModale();
    chargerCategories();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
      return;
    }
    alert('Catégorie supprimée avec succès');
    chargerCategories();
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Tag className="w-6 h-6" />
          <span>Gestion des Catégories</span>
        </h3>
        <button
          onClick={() => ouvrirModale()}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Catégorie</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {categories.map((categorie) => (
              <tr key={categorie.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{categorie.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-300">{categorie.description || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => ouvrirModale(categorie)}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => supprimer(categorie.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {categorieEnEdition ? 'Modifier' : 'Nouvelle'} Catégorie
              </h3>
              <button onClick={fermerModale} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formulaire.name}
                  onChange={(e) => setFormulaire({ ...formulaire, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formulaire.description}
                  onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={sauvegarder}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {categorieEnEdition ? 'Modifier' : 'Créer'}
                </button>
                <button
                  onClick={fermerModale}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
