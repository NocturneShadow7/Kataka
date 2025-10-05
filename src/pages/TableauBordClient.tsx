import { useState, useEffect } from 'react';
import { EnTete } from '../components/EnTete';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Boutique } from './Boutique';
import { SuiviFactures } from '../components/client/SuiviFactures';
import { GestionParrainage } from '../components/client/GestionParrainage';
import { CreditCard as SimIcon, FileText, ShoppingBag, CreditCard, X, Eye, Package, Calendar, Phone, Check, Clock, Users } from 'lucide-react';

interface Sim {
  id: string;
  sim_number: string;
  status: string;
  payment_status: string;
  price: number;
  activation_date: string | null;
  expiry_date: string | null;
  data_limit: string | null;
  subscription_type: string | null;
  plan_id: string | null;
  order_id: string | null;
  plan?: { name: string };
}

interface SimDetails extends Sim {
  order?: {
    order_number: string;
    created_at: string;
    total_amount: number;
  };
  invoice?: {
    invoice_number: string;
    amount: number;
    status: string;
  };
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    subscription_months: number;
    product: {
      name: string;
      description: string;
    };
  }>;
  invoice?: {
    invoice_number: string;
    status: string;
  };
  payment?: {
    payment_method: string;
    status: string;
  };
  crypto_check?: {
    status: string;
    received_amount: number | null;
    expected_amount: number;
    crypto_address: string;
    crypto_type: string;
  };
}

interface Facture {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface Commande {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface TableauBordClientProps {
  onAccueil?: () => void;
  onBoutique?: () => void;
}

export function TableauBordClient({ onAccueil, onBoutique }: TableauBordClientProps) {
  const { user } = useAuth();
  const [sims, setSims] = useState<Sim[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherBoutique, setAfficherBoutique] = useState(false);
  const [afficherFactures, setAfficherFactures] = useState(false);
  const [afficherParrainage, setAfficherParrainage] = useState(false);
  const [simSelectionnee, setSimSelectionnee] = useState<SimDetails | null>(null);
  const [commandeSelectionnee, setCommandeSelectionnee] = useState<OrderDetails | null>(null);
  const [chargementDetails, setChargementDetails] = useState(false);

  if (afficherBoutique) {
    return <Boutique onRetour={() => setAfficherBoutique(false)} />;
  }

  if (afficherFactures) {
    return (
      <div className="min-h-screen bg-gray-900">
        <EnTete
          onAccueil={onAccueil}
          onBoutique={onBoutique || (() => setAfficherBoutique(true))}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setAfficherFactures(false)}
            className="mb-6 text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Retour au tableau de bord
          </button>
          <SuiviFactures />
        </div>
      </div>
    );
  }

  if (afficherParrainage) {
    return (
      <div className="min-h-screen bg-gray-900">
        <EnTete
          onAccueil={onAccueil}
          onBoutique={onBoutique || (() => setAfficherBoutique(true))}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setAfficherParrainage(false)}
            className="mb-6 text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Retour au tableau de bord
          </button>
          <GestionParrainage />
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      chargerDonnees();
    }
  }, [user]);

  const chargerDonnees = async () => {
    const [resultatsims, resultatFactures, resultatCommandes] = await Promise.all([
      supabase.from('sims').select('*, sim_plans(name)').eq('client_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', user?.id).neq('status', 'draft').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('client_id', user?.id).order('created_at', { ascending: false }),
    ]);

    if (resultatsims.data) {
      const simsAvecForfaits = resultatsims.data.map((sim: any) => ({
        ...sim,
        plan: sim.sim_plans ? { name: sim.sim_plans.name } : undefined
      }));
      setSims(simsAvecForfaits);
    }
    if (resultatFactures.data) setFactures(resultatFactures.data);
    if (resultatCommandes.data) setCommandes(resultatCommandes.data);
    setChargement(false);
  };

  const chargerDetailsSim = async (sim: Sim) => {
    setChargementDetails(true);

    const { data: order } = await supabase
      .from('orders')
      .select('order_number, created_at, total_amount')
      .eq('id', sim.order_id)
      .maybeSingle();

    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, amount, status')
      .eq('order_id', sim.order_id)
      .neq('status', 'draft')
      .maybeSingle();

    setSimSelectionnee({
      ...sim,
      order: order || undefined,
      invoice: invoice || undefined
    });

    setChargementDetails(false);
  };

  const chargerDetailsCommande = async (commandeId: string) => {
    setChargementDetails(true);

    const { data: order } = await supabase
      .from('orders')
      .select('*')
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
      'active': 'Active',
      'inactive': 'Inactive',
      'suspended': 'Suspendue',
      'paid': 'Payée',
      'unpaid': 'Impayée',
      'pending': 'En attente'
    };
    return traductions[statut] || statut;
  };

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-900">
        <EnTete
          onAccueil={onAccueil}
          onBoutique={onBoutique || (() => setAfficherBoutique(true))}
        />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const simsActives = sims.filter((s) => s.status === 'active');
  const facturesImpayees = factures.filter((f) => f.status === 'unpaid' || f.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-900">
      <EnTete
        onAccueil={onAccueil}
        onBoutique={onBoutique || (() => setAfficherBoutique(true))}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 sm:mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Mon Tableau de Bord</h2>
            <p className="text-sm sm:text-base text-gray-400">Bienvenue {user?.full_name}</p>
          </div>
          <button
            onClick={() => setAfficherParrainage(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors shadow-lg"
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">Parrainage</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-3 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <SimIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <span className="text-xl sm:text-3xl font-bold text-white">{simsActives.length}</span>
            </div>
            <p className="text-blue-100 text-sm">SIM actives</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-3 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <SimIcon className="w-8 h-8 text-white" />
              <span className="text-3xl font-bold text-white">{sims.length}</span>
            </div>
            <p className="text-green-100 text-sm">Total SIM</p>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-3 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-white" />
              <span className="text-3xl font-bold text-white">{facturesImpayees.length}</span>
            </div>
            <p className="text-red-100 text-sm">Factures en attente</p>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-3 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 text-white" />
              <span className="text-3xl font-bold text-white">
                {facturesImpayees.reduce((sum, fac) => sum + fac.amount, 0).toFixed(2)}€
              </span>
            </div>
            <p className="text-orange-100 text-sm">Total à payer</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Mes cartes SIM</h3>
              <SimIcon className="w-6 h-6 text-blue-400" />
            </div>

            {sims.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucune carte SIM</p>
            ) : (
              <div className="space-y-4">
                {sims.map((sim) => (
                  <div
                    key={sim.id}
                    onClick={() => chargerDetailsSim(sim)}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">{sim.sim_number}</span>
                        <Eye className="w-3 h-3 text-blue-400" />
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sim.status === 'active'
                            ? 'bg-green-900/50 text-green-300'
                            : sim.status === 'inactive'
                            ? 'bg-gray-600 text-gray-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {traduireStatut(sim.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Forfait:</span>
                        <span className="ml-2 text-white">{sim.plan?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="ml-2 text-white">{sim.subscription_type || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Data:</span>
                        <span className="ml-2 text-white">{sim.data_limit || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Prix:</span>
                        <span className="ml-2 text-white">{sim.price}€</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Paiement:</span>
                        <span
                          className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            sim.payment_status === 'paid'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {traduireStatut(sim.payment_status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Expiration:</span>
                        <span className="ml-2 text-white">
                          {sim.expiry_date
                            ? new Date(sim.expiry_date).toLocaleDateString('fr-FR')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Mes factures</h3>
              <FileText className="w-6 h-6 text-blue-400" />
            </div>

            {factures.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucune facture</p>
            ) : (
              <div className="space-y-4">
                {factures.map((facture) => (
                  <div
                    key={facture.id}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-white font-mono text-sm">{facture.invoice_number}</span>
                        <p className="text-gray-400 text-xs mt-1">
                          Échéance: {new Date(facture.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          facture.status === 'paid'
                            ? 'bg-green-900/50 text-green-300'
                            : facture.status === 'unpaid'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-yellow-900/50 text-yellow-300'
                        }`}
                      >
                        {traduireStatut(facture.status)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-white">{facture.amount}€</span>
                      {facture.status === 'unpaid' && (
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                          Payer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Mes commandes</h3>
            <ShoppingBag className="w-6 h-6 text-blue-400" />
          </div>

          {commandes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Aucune commande</p>
              <button
                onClick={() => setAfficherBoutique(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Acheter une carte SIM
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {commandes.map((commande) => (
                <div
                  key={commande.id}
                  onClick={() => chargerDetailsCommande(commande.id)}
                  className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">{commande.order_number}</span>
                        <Eye className="w-3 h-3 text-blue-400" />
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        commande.status === 'paid'
                          ? 'bg-green-900/50 text-green-300'
                          : commande.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}
                    >
                      {commande.status === 'paid' ? 'Payée' : commande.status === 'pending' ? 'En attente' : 'Annulée'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-white">{Number(commande.total_amount).toFixed(2)}€</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Acheter une carte SIM</h3>
            <ShoppingBag className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-gray-400 mb-4">
            Consultez nos offres et commandez votre carte SIM en quelques clics
          </p>
          <button
            onClick={() => setAfficherBoutique(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Voir les offres
          </button>
        </div>
      </div>

      {simSelectionnee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSimSelectionnee(null)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">{simSelectionnee.sim_number}</h3>
                  <p className="text-sm text-gray-400">Détails de la carte SIM</p>
                </div>
              </div>
              <button
                onClick={() => setSimSelectionnee(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Statut</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      simSelectionnee.status === 'active'
                        ? 'bg-green-900/50 text-green-300'
                        : simSelectionnee.status === 'inactive'
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-red-900/50 text-red-300'
                    }`}>
                      {traduireStatut(simSelectionnee.status)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Statut du paiement</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    simSelectionnee.payment_status === 'paid'
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-red-900/50 text-red-300'
                  }`}>
                    {traduireStatut(simSelectionnee.payment_status)}
                  </span>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Forfait</p>
                  <p className="text-white">{simSelectionnee.plan?.name || 'Aucun'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Type d'abonnement</p>
                  <p className="text-white">{simSelectionnee.subscription_type || '-'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Limite de données</p>
                  <p className="text-white">{simSelectionnee.data_limit || '-'}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Prix</p>
                  <p className="text-white font-semibold">{simSelectionnee.price.toFixed(2)}€</p>
                </div>
                {simSelectionnee.activation_date && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">Date d'activation</p>
                    <p className="text-white">{new Date(simSelectionnee.activation_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
                {simSelectionnee.expiry_date && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">Date d'expiration</p>
                    <p className="text-white">{new Date(simSelectionnee.expiry_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>

              {simSelectionnee.order && (
                <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    Commande associée
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Numéro de commande</span>
                      <span className="text-sm text-white font-mono">{simSelectionnee.order.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Date</span>
                      <span className="text-sm text-white">{new Date(simSelectionnee.order.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Montant total</span>
                      <span className="text-sm text-white font-semibold">{simSelectionnee.order.total_amount.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              )}

              {simSelectionnee.invoice && (
                <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Facture
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Numéro de facture</span>
                      <span className="text-sm text-white font-mono">{simSelectionnee.invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Montant</span>
                      <span className="text-sm text-white font-semibold">{simSelectionnee.invoice.amount.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Statut</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        simSelectionnee.invoice.status === 'paid'
                          ? 'bg-green-900/50 text-green-300'
                          : simSelectionnee.invoice.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {traduireStatut(simSelectionnee.invoice.status)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {commandeSelectionnee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCommandeSelectionnee(null)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">{commandeSelectionnee.order_number}</h3>
                  <p className="text-sm text-gray-400">Détails de la commande</p>
                </div>
              </div>
              <button
                onClick={() => setCommandeSelectionnee(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Date de commande</p>
                  <p className="text-white">{new Date(commandeSelectionnee.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Statut</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    commandeSelectionnee.status === 'paid'
                      ? 'bg-green-900/50 text-green-300'
                      : commandeSelectionnee.status === 'pending'
                      ? 'bg-yellow-900/50 text-yellow-300'
                      : 'bg-red-900/50 text-red-300'
                  }`}>
                    {commandeSelectionnee.status === 'paid' ? 'Payée' : commandeSelectionnee.status === 'pending' ? 'En attente' : 'Annulée'}
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
                    {commandeSelectionnee.crypto_check.status === 'pending' && (
                      <div className="bg-blue-900/20 border border-blue-700 rounded p-2">
                        <p className="text-xs text-blue-300">
                          ⏱ Le système vérifie automatiquement les transactions blockchain toutes les minutes.
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
