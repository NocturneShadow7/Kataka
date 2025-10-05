import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, X, Smartphone } from 'lucide-react';

interface ForfaitSim {
  id: string;
  name: string;
  description: string | null;
  data_limit: string | null;
  price: number;
  duration_days: number;
  created_at: string;
}

export function GestionForfaitsSim() {
  const [forfaits, setForfaits] = useState<ForfaitSim[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [forfaitEnEdition, setForfaitEnEdition] = useState<ForfaitSim | null>(null);
  const [formulaire, setFormulaire] = useState({
    name: '',
    description: '',
    data_limit: '',
    price: 0,
    duration_days: 30
  });

  useEffect(() => {
    chargerForfaits();
  }, []);

  const chargerForfaits = async () => {
    const { data, error } = await supabase
      .from('sim_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setForfaits(data);
    }
    setChargement(false);
  };

  const ouvrirModale = (forfait?: ForfaitSim) => {
    if (forfait) {
      setForfaitEnEdition(forfait);
      setFormulaire({
        name: forfait.name,
        description: forfait.description || '',
        data_limit: forfait.data_limit || '',
        price: forfait.price,
        duration_days: forfait.duration_days
      });
    } else {
      setForfaitEnEdition(null);
      setFormulaire({
        name: '',
        description: '',
        data_limit: '',
        price: 0,
        duration_days: 30
      });
    }
    setModaleOuverte(true);
  };

  const fermerModale = () => {
    setModaleOuverte(false);
    setForfaitEnEdition(null);
  };

  const sauvegarder = async () => {
    if (!formulaire.name || formulaire.price <= 0) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const donnees = {
      name: formulaire.name,
      description: formulaire.description || null,
      data_limit: formulaire.data_limit || null,
      price: formulaire.price,
      duration_days: formulaire.duration_days
    };

    if (forfaitEnEdition) {
      const { error } = await supabase.from('sim_plans').update(donnees).eq('id', forfaitEnEdition.id);
      if (error) {
        alert('Erreur lors de la modification: ' + error.message);
        return;
      }
      alert('Forfait modifié avec succès');
    } else {
      const { error } = await supabase.from('sim_plans').insert(donnees);
      if (error) {
        alert('Erreur lors de la création: ' + error.message);
        return;
      }
      alert('Forfait créé avec succès');
    }

    fermerModale();
    chargerForfaits();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce forfait ?')) return;

    const { error } = await supabase.from('sim_plans').delete().eq('id', id);
    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
      return;
    }
    alert('Forfait supprimé avec succès');
    chargerForfaits();
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Smartphone className="w-6 h-6" />
          <span>Gestion des Forfaits SIM</span>
        </h3>
        <button
          onClick={() => ouvrirModale()}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau Forfait</span>
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
                Données
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Prix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Durée
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {forfaits.map((forfait) => (
              <tr key={forfait.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-white">{forfait.name}</div>
                  <div className="text-xs text-gray-400">{forfait.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">{forfait.data_limit || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">{forfait.price} €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">{forfait.duration_days} jours</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => ouvrirModale(forfait)}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => supprimer(forfait.id)}
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
                {forfaitEnEdition ? 'Modifier' : 'Nouveau'} Forfait SIM
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
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Limite de données
                </label>
                <input
                  type="text"
                  value={formulaire.data_limit}
                  onChange={(e) => setFormulaire({ ...formulaire, data_limit: e.target.value })}
                  placeholder="Ex: 50 GB, Illimité"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prix (€) *
                  </label>
                  <input
                    type="number"
                    value={formulaire.price}
                    onChange={(e) => setFormulaire({ ...formulaire, price: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={formulaire.duration_days}
                    onChange={(e) => setFormulaire({ ...formulaire, duration_days: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={sauvegarder}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {forfaitEnEdition ? 'Modifier' : 'Créer'}
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
