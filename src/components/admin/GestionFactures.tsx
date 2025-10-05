import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';

interface Facture {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending';
  due_date: string;
  created_at: string;
  payment_method?: string;
  payment_proof?: string;
  client?: { full_name: string; email: string };
}

export function GestionFactures() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [formulaire, setFormulaire] = useState({
    client_id: '',
    amount: 0,
    status: 'unpaid' as 'paid' | 'unpaid' | 'pending',
    due_date: ''
  });

  useEffect(() => {
    chargerFactures();
    chargerUtilisateurs();
  }, []);

  const chargerUtilisateurs = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('role', 'client')
      .order('full_name');

    if (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
    if (!error && data) {
      setUtilisateurs(data.map(u => ({ id: u.user_id, full_name: u.full_name, email: u.email })));
    }
  };

  const ouvrirModale = () => {
    setFormulaire({
      client_id: '',
      amount: 0,
      status: 'unpaid',
      due_date: ''
    });
    setModaleOuverte(true);
  };

  const fermerModale = () => {
    setModaleOuverte(false);
  };

  const sauvegarder = async () => {
    if (!formulaire.client_id || !formulaire.amount || !formulaire.due_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const invoice_number = `INV-${Date.now()}`;

    const donnees = {
      invoice_number,
      client_id: formulaire.client_id,
      amount: formulaire.amount,
      status: formulaire.status,
      due_date: formulaire.due_date
    };

    const { error } = await supabase.from('invoices').insert(donnees);

    if (error) {
      alert('Erreur lors de la création: ' + error.message);
      return;
    }

    alert('Facture créée avec succès');
    fermerModale();
    chargerFactures();
  };

  const chargerFactures = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:profiles!client_id(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement factures:', error);
    }
    if (!error && data) {
      const facturesAvecUrls = await Promise.all(
        data.map(async (facture) => {
          if (facture.payment_proof) {
            const { data: urlData } = supabase.storage
              .from('payment-proofs')
              .getPublicUrl(facture.payment_proof);

            return {
              ...facture,
              payment_proof: urlData.publicUrl
            };
          }
          return facture;
        })
      );
      setFactures(facturesAvecUrls);
    }
    setChargement(false);
  };

  const traduireStatut = (statut: string) => {
    const traductions: Record<string, string> = {
      'paid': 'Payée',
      'unpaid': 'Impayée',
      'pending': 'En attente'
    };
    return traductions[statut] || statut;
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  const facturesEnAttente = factures.filter((f) => f.status === 'pending');

  const validerFacture = async (factureId: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', factureId);

    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }

    alert('Facture confirmée avec succès');
    chargerFactures();
  };

  const rejeterFacture = async (factureId: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'unpaid' })
      .eq('id', factureId);

    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }

    alert('Facture rejetée');
    chargerFactures();
  };

  const supprimerFacture = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
      return;
    }

    alert('Facture supprimée avec succès');
    chargerFactures();
  };

  const mettreAJourStatut = async (id: string, statut: 'paid' | 'unpaid' | 'pending') => {
    const { error } = await supabase.from('invoices').update({ status: statut }).eq('id', id);
    if (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
      return;
    }
    chargerFactures();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Gestion des factures</h3>
          {facturesEnAttente.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm text-yellow-400 font-medium">
                {facturesEnAttente.length} facture{facturesEnAttente.length > 1 ? 's' : ''} en attente de validation
              </span>
            </div>
          )}
        </div>
        <button
          onClick={ouvrirModale}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle facture</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">N° Facture</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Client</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Montant</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Paiement</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Date échéance</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((facture) => (
              <tr key={facture.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-3 px-4 text-white font-mono text-sm">{facture.invoice_number}</td>
                <td className="py-3 px-4 text-gray-300">
                  {facture.client ? (
                    <div>
                      <div className="font-medium">{facture.client.full_name}</div>
                      <div className="text-xs text-gray-500">{facture.client.email}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-3 px-4 text-white font-semibold">{facture.amount}€</td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    {facture.payment_method && (
                      <div className="text-xs text-gray-400">
                        {facture.payment_method === 'pcs' ? 'Coupon PCS' : 'Crypto'}
                      </div>
                    )}
                    {facture.payment_proof && (
                      <a
                        href={facture.payment_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline block"
                      >
                        Voir justificatif
                      </a>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={facture.status}
                    onChange={(e) => mettreAJourStatut(facture.id, e.target.value as 'paid' | 'unpaid' | 'pending')}
                    className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="paid">{traduireStatut('paid')}</option>
                    <option value="unpaid">{traduireStatut('unpaid')}</option>
                    <option value="pending">{traduireStatut('pending')}</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {new Date(facture.due_date).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {facture.status === 'pending' && (
                      <>
                        <button
                          onClick={() => validerFacture(facture.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                          title="Valider la facture"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Valider
                        </button>
                        <button
                          onClick={() => rejeterFacture(facture.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                          title="Rejeter la facture"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeter
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => supprimerFacture(facture.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Supprimer la facture"
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
                Nouvelle facture
              </h3>
              <button onClick={fermerModale} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client *
                </label>
                <select
                  value={formulaire.client_id}
                  onChange={(e) => setFormulaire({ ...formulaire, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner un client</option>
                  {utilisateurs.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Montant (€) *
                </label>
                <input
                  type="number"
                  value={formulaire.amount}
                  onChange={(e) => setFormulaire({ ...formulaire, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date d'échéance *
                </label>
                <input
                  type="date"
                  value={formulaire.due_date}
                  onChange={(e) => setFormulaire({ ...formulaire, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Statut
                </label>
                <select
                  value={formulaire.status}
                  onChange={(e) => setFormulaire({ ...formulaire, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="unpaid">Impayée</option>
                  <option value="pending">En attente</option>
                  <option value="paid">Payée</option>
                </select>
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
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
