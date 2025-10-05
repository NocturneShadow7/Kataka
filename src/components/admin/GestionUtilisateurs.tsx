import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, X } from 'lucide-react';

interface Utilisateur {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'client';
  trusted: boolean;
  subscription_fee: number;
  created_at: string;
}

export function GestionUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [utilisateurEnEdition, setUtilisateurEnEdition] = useState<Utilisateur | null>(null);
  const [formulaire, setFormulaire] = useState({
    email: '',
    full_name: '',
    role: 'client' as 'admin' | 'client',
    trusted: false,
    password: ''
  });

  useEffect(() => {
    chargerUtilisateurs();
  }, []);

  const chargerUtilisateurs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session');
        setChargement(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-users`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error loading users:', result.error);
      } else {
        setUtilisateurs(result.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setChargement(false);
  };

  const ouvrirModale = (utilisateur?: Utilisateur) => {
    if (utilisateur) {
      setUtilisateurEnEdition(utilisateur);
      setFormulaire({
        email: utilisateur.email,
        full_name: utilisateur.full_name,
        role: utilisateur.role,
        trusted: utilisateur.trusted || false,
        password: ''
      });
    } else {
      setUtilisateurEnEdition(null);
      setFormulaire({
        email: '',
        full_name: '',
        role: 'client',
        trusted: false,
        password: ''
      });
    }
    setModaleOuverte(true);
  };

  const fermerModale = () => {
    setModaleOuverte(false);
    setUtilisateurEnEdition(null);
  };

  const sauvegarder = async () => {
    if (!formulaire.email || !formulaire.full_name) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!utilisateurEnEdition && !formulaire.password) {
      alert('Le mot de passe est obligatoire pour un nouvel utilisateur');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Session expirée, veuillez vous reconnecter');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const body = {
        email: formulaire.email,
        full_name: formulaire.full_name,
        role: formulaire.role,
        trusted: formulaire.trusted,
        password: formulaire.password || undefined,
        user_id: utilisateurEnEdition?.id || undefined
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert('Erreur: ' + (result.error || 'Erreur inconnue'));
        return;
      }

      alert(result.message || 'Utilisateur enregistré avec succès');
      fermerModale();
      chargerUtilisateurs();
    } catch (error: any) {
      console.error('Error details:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const supprimerUtilisateur = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      alert('Erreur lors de la suppression: ' + authError.message);
      return;
    }

    alert('Utilisateur supprimé avec succès');
    chargerUtilisateurs();
  };

  const mettreAJourRole = async (userId: string, nouveauRole: 'admin' | 'client') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: nouveauRole })
      .eq('user_id', userId);

    if (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
      return;
    }

    chargerUtilisateurs();
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Gestion des utilisateurs</h3>
        <button
          onClick={() => ouvrirModale()}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel utilisateur</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Nom</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Rôle</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Date création</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((utilisateur) => (
              <tr key={utilisateur.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-3 px-4 text-white">{utilisateur.full_name}</td>
                <td className="py-3 px-4 text-gray-300">{utilisateur.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={utilisateur.role}
                    onChange={(e) => mettreAJourRole(utilisateur.id, e.target.value as 'admin' | 'client')}
                    className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    utilisateur.trusted
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-orange-900/50 text-orange-300'
                  }`}>
                    {utilisateur.trusted ? 'De confiance' : 'Non-confiance'}
                  </span>
                  {!utilisateur.trusted && utilisateur.subscription_fee > 0 && (
                    <div className="text-xs text-gray-500 mt-1">{utilisateur.subscription_fee}€/mois</div>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {new Date(utilisateur.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => ouvrirModale(utilisateur)}
                      className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => supprimerUtilisateur(utilisateur.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">
                {utilisateurEnEdition ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h3>
              <button onClick={fermerModale} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={formulaire.full_name}
                  onChange={(e) => setFormulaire({ ...formulaire, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formulaire.email}
                  onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="jean.dupont@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rôle
                </label>
                <select
                  value={formulaire.role}
                  onChange={(e) => setFormulaire({ ...formulaire, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="client">Client</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Statut de confiance
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="trusted"
                    checked={formulaire.trusted}
                    onChange={(e) => setFormulaire({ ...formulaire, trusted: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="trusted" className="text-sm text-gray-300">
                    Client de confiance (accès gratuit + code parrainage gratuit)
                  </label>
                </div>
                {!formulaire.trusted && (
                  <p className="text-xs text-gray-500 mt-2">
                    Client non-confiance: abonnement 4.99€/mois + code parrainage à 0.99€
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mot de passe {utilisateurEnEdition ? '(laisser vide pour ne pas changer)' : '*'}
                </label>
                <input
                  type="password"
                  value={formulaire.password}
                  onChange={(e) => setFormulaire({ ...formulaire, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={fermerModale}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={sauvegarder}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {utilisateurEnEdition ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
