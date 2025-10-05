import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Eye, X, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Paiement {
  id: string;
  order_id: string;
  payment_method: 'pcs' | 'crypto';
  payment_code: string | null;
  crypto_address: string | null;
  crypto_type: string | null;
  status: 'pending' | 'validated' | 'rejected';
  proof_url: string | null;
  created_at: string;
  order?: {
    order_number: string;
    client?: { full_name: string; email: string };
  };
}

export function GestionPaiements() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [paiementSelectionne, setPaiementSelectionne] = useState<Paiement | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    chargerPaiements();
  }, []);

  const chargerPaiements = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        order:orders!order_id(
          order_number,
          client_id,
          client:profiles!client_id(full_name, email)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement paiements:', error);
    }
    if (!error && data) {
      const paiementsAvecUrls = await Promise.all(
        data.map(async (paiement) => {
          if (paiement.proof_url) {
            const { data: urlData } = supabase.storage
              .from('payment-proofs')
              .getPublicUrl(paiement.proof_url);

            return {
              ...paiement,
              proof_url: urlData.publicUrl
            };
          }
          return paiement;
        })
      );
      setPaiements(paiementsAvecUrls);
    }
    setChargement(false);
  };

  const validerPaiement = async (id: string, statut: 'validated' | 'rejected') => {
    if (!user) return;

    try {
      const paiement = paiements.find(p => p.id === id);
      if (!paiement) return;

      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: statut,
          validated_by: user.id,
          validated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (paymentError) throw paymentError;

      if (statut === 'validated') {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', paiement.order_id);

        if (orderError) throw orderError;

        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('order_id', paiement.order_id);

        if (invoiceError) throw invoiceError;

        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', paiement.order_id);

        if (orderItems && orderItems.length > 0) {
          const { data: orders } = await supabase
            .from('orders')
            .select('client_id')
            .eq('id', paiement.order_id)
            .single();

          if (orders) {
            for (const item of orderItems) {
              const { data: availableSims } = await supabase
                .from('sims')
                .select('*')
                .is('client_id', null)
                .eq('status', 'inactive')
                .limit(item.quantity);

              if (availableSims && availableSims.length >= item.quantity) {
                for (let i = 0; i < item.quantity; i++) {
                  await supabase
                    .from('sims')
                    .update({
                      client_id: orders.client_id,
                      status: 'active',
                      payment_status: 'paid',
                      activation_date: new Date().toISOString().split('T')[0]
                    })
                    .eq('id', availableSims[i].id);
                }
              }
            }
          }
        }
      } else if (statut === 'rejected') {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', paiement.order_id);
      }

      chargerPaiements();
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      alert('Erreur lors de la validation du paiement');
    }
  };

  const paiementsEnAttente = paiements.filter((p) => p.status === 'pending');
  const paiementsTraites = paiements.filter((p) => p.status !== 'pending');

  const supprimerPaiement = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) return;

    const { error } = await supabase.from('payments').delete().eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
      return;
    }

    alert('Paiement supprimé avec succès');
    chargerPaiements();
  };

  const mettreAJourStatut = async (id: string, statut: 'pending' | 'validated' | 'rejected') => {
    const { error } = await supabase.from('payments').update({ status: statut }).eq('id', id);
    if (error) {
      alert('Erreur lors de la mise à jour: ' + error.message);
      return;
    }
    chargerPaiements();
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Validation des paiements</h3>
        <p className="text-gray-400">
          {paiementsEnAttente.length} paiement(s) en attente de validation
        </p>
      </div>

      {paiementsEnAttente.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium text-white mb-4">En attente</h4>
          <div className="space-y-4">
            {paiementsEnAttente.map((paiement) => (
              <div
                key={paiement.id}
                className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => setPaiementSelectionne(paiement)}>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-white font-semibold">
                        {paiement.order?.order_number}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          paiement.payment_method === 'pcs'
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-green-900/50 text-green-300'
                        }`}
                      >
                        {paiement.payment_method.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>
                        Client: {paiement.order?.client?.full_name} ({paiement.order?.client?.email})
                      </p>
                      {paiement.payment_method === 'pcs' && paiement.payment_code && (
                        <p className="font-mono">Code PCS: {paiement.payment_code}</p>
                      )}
                      {paiement.payment_method === 'crypto' && (
                        <>
                          <p>Type: {paiement.crypto_type}</p>
                          <p className="font-mono text-xs">Adresse: {paiement.crypto_address}</p>
                        </>
                      )}
                      <p>Date: {new Date(paiement.created_at).toLocaleString('fr-FR')}</p>
                      {paiement.proof_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaiementSelectionne(paiement);
                          }}
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">Voir la preuve</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        validerPaiement(paiement.id, 'validated');
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Valider</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        validerPaiement(paiement.id, 'rejected');
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeter</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        supprimerPaiement(paiement.id);
                      }}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Supprimer le paiement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-lg font-medium text-white mb-4">Historique</h4>
        {paiementsTraites.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Aucun paiement traité pour le moment
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Commande</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Client</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Méthode</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Détails</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paiementsTraites.map((paiement) => (
                  <tr
                    key={paiement.id}
                    onClick={() => setPaiementSelectionne(paiement)}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                  >
                    <td className="py-3 px-4 text-white font-mono text-sm">
                      {paiement.order?.order_number}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {paiement.order?.client ? (
                        <div>
                          <div className="font-medium">{paiement.order.client.full_name}</div>
                          <div className="text-xs text-gray-500">{paiement.order.client.email}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                        {paiement.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {paiement.payment_method === 'pcs'
                        ? paiement.payment_code
                        : `${paiement.crypto_type} - ${paiement.crypto_address?.substring(0, 12)}...`}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={paiement.status}
                        onChange={(e) => mettreAJourStatut(paiement.id, e.target.value as 'pending' | 'validated' | 'rejected')}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="pending">En attente</option>
                        <option value="validated">Validé</option>
                        <option value="rejected">Rejeté</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(paiement.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          supprimerPaiement(paiement.id);
                        }}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Supprimer le paiement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paiementSelectionne && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPaiementSelectionne(null)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{paiementSelectionne.order?.order_number}</h3>
                <p className="text-sm text-gray-400">Détails du paiement</p>
              </div>
              <button
                onClick={() => setPaiementSelectionne(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Client</p>
                  <p className="text-white font-medium">{paiementSelectionne.order?.client?.full_name || '-'}</p>
                  <p className="text-xs text-gray-400 mt-1">{paiementSelectionne.order?.client?.email || '-'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Date</p>
                  <p className="text-white">{new Date(paiementSelectionne.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Méthode de paiement</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  paiementSelectionne.payment_method === 'pcs'
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-green-900/50 text-green-300'
                }`}>
                  {paiementSelectionne.payment_method.toUpperCase()}
                </span>
              </div>

              {paiementSelectionne.payment_method === 'pcs' && paiementSelectionne.payment_code && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Code PCS</p>
                  <p className="text-white font-mono">{paiementSelectionne.payment_code}</p>
                </div>
              )}

              {paiementSelectionne.payment_method === 'crypto' && (
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Type de crypto</p>
                    <p className="text-white">{paiementSelectionne.crypto_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Adresse</p>
                    <p className="text-white font-mono text-xs break-all">{paiementSelectionne.crypto_address}</p>
                  </div>
                </div>
              )}

              {paiementSelectionne.proof_url && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-3">Preuve de paiement</p>
                  {paiementSelectionne.proof_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={paiementSelectionne.proof_url}
                      alt="Preuve de paiement"
                      className="w-full rounded-lg border border-gray-600"
                    />
                  ) : (
                    <a
                      href={paiementSelectionne.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir la preuve
                    </a>
                  )}
                </div>
              )}

              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Statut</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  paiementSelectionne.status === 'validated'
                    ? 'bg-green-900/50 text-green-300'
                    : paiementSelectionne.status === 'rejected'
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-yellow-900/50 text-yellow-300'
                }`}>
                  {paiementSelectionne.status === 'validated' ? 'Validé' :
                   paiementSelectionne.status === 'rejected' ? 'Rejeté' :
                   'En attente'}
                </span>
              </div>

              {paiementSelectionne.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      validerPaiement(paiementSelectionne.id, 'validated');
                      setPaiementSelectionne(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Valider le paiement
                  </button>
                  <button
                    onClick={() => {
                      validerPaiement(paiementSelectionne.id, 'rejected');
                      setPaiementSelectionne(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <XCircle className="w-5 h-5" />
                    Rejeter le paiement
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
