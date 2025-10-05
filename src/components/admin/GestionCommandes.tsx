import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Check, Clock, FileText, Package } from 'lucide-react';

interface Commande {
  id: string;
  order_number: string;
  client_id: string;
  product_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  client?: { full_name: string; email: string };
  product?: { name: string };
}

interface CommandeDetails extends Commande {
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    subscription_months: number;
    product: { name: string; description: string };
  }>;
  invoice?: {
    invoice_number: string;
    status: string;
  };
  payment?: {
    payment_method: string;
    status: string;
    id: string;
  };
  crypto_check?: {
    status: string;
    received_amount: number | null;
    expected_amount: number;
    crypto_address: string;
    crypto_type: string;
  };
}

export function GestionCommandes() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [commandeSelectionnee, setCommandeSelectionnee] = useState<CommandeDetails | null>(null);
  const [chargementDetails, setChargementDetails] = useState(false);

  useEffect(() => {
    chargerCommandes();
  }, []);

  const chargerCommandes = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:profiles!client_id(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement commandes:', error);
    }
    if (!error && data) {
      setCommandes(data);
    }
    setChargement(false);
  };

  const mettreAJourStatut = async (id: string, statut: Commande['status']) => {
    await supabase.from('orders').update({ status: statut }).eq('id', id);
    chargerCommandes();
  };

  const chargerDetailsCommande = async (commandeId: string) => {
    setChargementDetails(true);

    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        client:profiles!orders_client_id_fkey_profiles(full_name, email),
        product:products(name)
      `)
      .eq('id', commandeId)
      .single();

    const { data: items } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(name, description)
      `)
      .eq('order_id', commandeId);

    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, status')
      .eq('order_id', commandeId)
      .neq('status', 'draft')
      .maybeSingle();

    const { data: payment } = await supabase
      .from('payments')
      .select('payment_method, status, id')
      .eq('order_id', commandeId)
      .maybeSingle();

    let cryptoCheck = null;
    if (payment?.payment_method === 'crypto') {
      const { data: check } = await supabase
        .from('crypto_payment_checks')
        .select('status, received_amount, expected_amount, crypto_address, crypto_type')
        .eq('payment_id', payment.id)
        .maybeSingle();
      cryptoCheck = check;
    }

    if (order && items) {
      setCommandeSelectionnee({
        ...order,
        items,
        invoice: invoice || undefined,
        payment: payment || undefined,
        crypto_check: cryptoCheck || undefined
      });
    }

    setChargementDetails(false);
  };

  const traduireStatut = (statut: string) => {
    const traductions: Record<string, string> = {
      'pending': 'En attente',
      'processing': 'En traitement',
      'completed': 'Complétée',
      'cancelled': 'Annulée',
      'paid': 'Payée',
      'unpaid': 'Impayée'
    };
    return traductions[statut] || statut;
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">Gestion des commandes</h3>
        <p className="text-gray-400 text-sm mt-1">{commandes.length} commande(s)</p>
      </div>

      {commandes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Aucune commande pour le moment
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">N° Commande</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Client</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Produit</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Montant</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {commandes.map((commande) => (
              <tr
                key={commande.id}
                onClick={() => chargerDetailsCommande(commande.id)}
                className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
              >
                <td className="py-3 px-4 text-white font-mono text-sm">{commande.order_number}</td>
                <td className="py-3 px-4 text-gray-300">
                  {commande.client ? (
                    <div>
                      <div className="font-medium">{commande.client.full_name}</div>
                      <div className="text-xs text-gray-500">{commande.client.email}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-3 px-4 text-gray-300">{commande.product?.name || '-'}</td>
                <td className="py-3 px-4 text-white font-semibold">{commande.total_amount}€</td>
                <td className="py-3 px-4">
                  <select
                    value={commande.status}
                    onChange={(e) => mettreAJourStatut(commande.id, e.target.value as Commande['status'])}
                    className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="pending">{traduireStatut('pending')}</option>
                    <option value="processing">{traduireStatut('processing')}</option>
                    <option value="completed">{traduireStatut('completed')}</option>
                    <option value="cancelled">{traduireStatut('cancelled')}</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {commandeSelectionnee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCommandeSelectionnee(null)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{commandeSelectionnee.order_number}</h3>
                <p className="text-sm text-gray-400">Détails de la commande</p>
              </div>
              <button
                onClick={() => setCommandeSelectionnee(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Client</p>
                  <p className="text-white font-medium">{commandeSelectionnee.client?.full_name || '-'}</p>
                  <p className="text-xs text-gray-400 mt-1">{commandeSelectionnee.client?.email || '-'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Date</p>
                  <p className="text-white">{new Date(commandeSelectionnee.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Statut</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    commandeSelectionnee.status === 'completed'
                      ? 'bg-green-900/50 text-green-300'
                      : commandeSelectionnee.status === 'processing'
                      ? 'bg-blue-900/50 text-blue-300'
                      : commandeSelectionnee.status === 'cancelled'
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    {traduireStatut(commandeSelectionnee.status)}
                  </span>
                </div>
              </div>

              {commandeSelectionnee.crypto_check && (
                <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    {commandeSelectionnee.crypto_check.status === 'confirmed' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-400" />
                    )}
                    Paiement Crypto {commandeSelectionnee.crypto_check.crypto_type}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Statut</span>
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                        commandeSelectionnee.crypto_check.status === 'confirmed'
                          ? 'bg-green-900/50 text-green-300'
                          : commandeSelectionnee.crypto_check.status === 'underpaid'
                          ? 'bg-orange-900/50 text-orange-300'
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {commandeSelectionnee.crypto_check.status === 'confirmed' ? '✓ Confirmé' :
                         commandeSelectionnee.crypto_check.status === 'underpaid' ? '⚠ Montant insuffisant' :
                         '⏳ Vérification en cours'}
                      </span>
                    </div>
                    <div className="bg-gray-800/50 rounded p-3">
                      <p className="text-xs text-gray-400 mb-1">Adresse de paiement:</p>
                      <p className="text-white font-mono text-xs break-all">{commandeSelectionnee.crypto_check.crypto_address}</p>
                    </div>
                    {commandeSelectionnee.crypto_check.status === 'underpaid' && commandeSelectionnee.crypto_check.received_amount !== null && (
                      <div className="bg-orange-900/20 border border-orange-700 rounded p-2">
                        <p className="text-xs text-orange-300">
                          Montant reçu: {commandeSelectionnee.crypto_check.received_amount.toFixed(8)} (attendu: {commandeSelectionnee.crypto_check.expected_amount.toFixed(2)}€)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {commandeSelectionnee.invoice && (
                <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Facture associée
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Numéro</span>
                      <span className="text-sm text-white font-mono">{commandeSelectionnee.invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Statut</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        commandeSelectionnee.invoice.status === 'paid'
                          ? 'bg-green-900/50 text-green-300'
                          : commandeSelectionnee.invoice.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {traduireStatut(commandeSelectionnee.invoice.status)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  Articles commandés
                </h4>
                <div className="space-y-3">
                  {commandeSelectionnee.items.map((item) => (
                    <div key={item.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">{item.product.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{item.product.description}</p>
                        </div>
                        <p className="text-white font-semibold">{item.unit_price.toFixed(2)}€</p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400">Quantité: <span className="text-white">{item.quantity}</span></span>
                          {item.subscription_months > 1 && (
                            <span className="text-gray-400">Durée: <span className="text-white">{item.subscription_months} mois</span></span>
                          )}
                        </div>
                        <span className="text-white font-semibold">{item.subtotal.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-300">Total</span>
                  <span className="text-2xl font-bold text-white">{commandeSelectionnee.total_amount.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
