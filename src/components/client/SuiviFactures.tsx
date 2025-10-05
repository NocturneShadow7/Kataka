import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, X, Eye, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  payment_method?: string;
  payment_proof?: string;
  order_id?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  subscription_months: number;
  discount_percent: number;
  original_price: number;
  product: {
    name: string;
    description: string;
    product_type: string;
  };
}

interface InvoiceDetails {
  invoice: Invoice;
  order: {
    order_number: string;
    total_amount: number;
    created_at: string;
  };
  items: OrderItem[];
  payment?: {
    payment_method: string;
    payment_code?: string;
    crypto_type?: string;
    crypto_address?: string;
    proof_url?: string;
    status: string;
  };
}

export function SuiviFactures() {
  const { user } = useAuth();
  const [factures, setFactures] = useState<Invoice[]>([]);
  const [chargement, setChargement] = useState(true);
  const [factureSelectionnee, setFactureSelectionnee] = useState<InvoiceDetails | null>(null);
  const [chargementDetails, setChargementDetails] = useState(false);

  useEffect(() => {
    chargerFactures();
  }, []);

  const chargerFactures = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', user?.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (data) {
      setFactures(data);
    }
    setChargement(false);
  };

  const chargerDetailsFacture = async (invoiceId: string) => {
    setChargementDetails(true);

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      setChargementDetails(false);
      return;
    }

    const { data: order } = await supabase
      .from('orders')
      .select('order_number, total_amount, created_at')
      .eq('id', invoice.order_id)
      .single();

    const { data: items } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(name, description, product_type)
      `)
      .eq('order_id', invoice.order_id);

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', invoice.order_id)
      .maybeSingle();

    let paymentWithUrl = payment;
    if (payment && payment.proof_url) {
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(payment.proof_url);

      paymentWithUrl = {
        ...payment,
        proof_url: urlData.publicUrl
      };
    }

    if (invoice && order && items) {
      setFactureSelectionnee({
        invoice,
        order,
        items,
        payment: paymentWithUrl || undefined
      });
    }

    setChargementDetails(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'unpaid':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Confirmée';
      case 'unpaid':
        return 'Annulée';
      case 'pending':
        return 'En attente de validation';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-900/30 border-green-700 text-green-300';
      case 'unpaid':
        return 'bg-red-900/30 border-red-700 text-red-300';
      case 'pending':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-300';
      default:
        return 'bg-gray-900/30 border-gray-700 text-gray-300';
    }
  };

  if (chargement) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          Suivi des factures
        </h3>
      </div>

      {factures.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Aucune facture pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {factures.map((facture) => (
            <div
              key={facture.id}
              className={`bg-gray-800 border rounded-lg p-6 transition-all hover:shadow-lg cursor-pointer ${getStatusColor(
                facture.status
              )}`}
              onClick={() => chargerDetailsFacture(facture.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(facture.status)}
                  <div>
                    <h4 className="text-lg font-semibold text-white">{facture.invoice_number}</h4>
                    <p className="text-sm text-gray-400">
                      Créée le {new Date(facture.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400">Cliquez pour détails</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{facture.amount.toFixed(2)}€</p>
                  <p className="text-sm text-gray-400">
                    Échéance: {new Date(facture.due_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Statut</p>
                    <p className="text-sm font-medium text-white">{getStatusText(facture.status)}</p>
                  </div>
                  {facture.payment_method && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Méthode de paiement</p>
                      <p className="text-sm font-medium text-white">
                        {facture.payment_method === 'pcs' ? 'Coupon PCS' : 'Cryptomonnaie'}
                      </p>
                    </div>
                  )}
                  {facture.payment_proof && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Preuve de paiement</p>
                      <a
                        href={facture.payment_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Voir le justificatif
                      </a>
                    </div>
                  )}
                </div>

                {facture.status === 'pending' && (
                  <div className="mt-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-300 mb-1">
                          Votre facture est en cours de vérification
                        </p>
                        <p className="text-xs text-yellow-400/80">
                          Un administrateur va valider votre paiement sous peu. Vous serez notifié dès
                          que votre facture sera confirmée ou en cas de problème.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {facture.status === 'paid' && (
                  <div className="mt-4 bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-300">Facture confirmée</p>
                        <p className="text-xs text-green-400/80">
                          Votre paiement a été validé avec succès.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {facture.status === 'unpaid' && (
                  <div className="mt-4 bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-300">Facture annulée</p>
                        <p className="text-xs text-red-400/80">
                          Votre paiement n'a pas pu être validé. Veuillez contacter le support pour plus
                          d'informations.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {factureSelectionnee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setFactureSelectionnee(null)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">{factureSelectionnee.invoice.invoice_number}</h3>
                  <p className="text-sm text-gray-400">Détails de la facture</p>
                </div>
              </div>
              <button
                onClick={() => setFactureSelectionnee(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Numéro de commande</p>
                  <p className="text-white font-mono">{factureSelectionnee.order.order_number}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Date de création</p>
                  <p className="text-white">{new Date(factureSelectionnee.invoice.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Date d'échéance</p>
                  <p className="text-white">{new Date(factureSelectionnee.invoice.due_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Statut</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(factureSelectionnee.invoice.status)}
                    <span className="text-white font-medium">{getStatusText(factureSelectionnee.invoice.status)}</span>
                  </div>
                </div>
              </div>

              {factureSelectionnee.payment && (
                <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                    Informations de paiement
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Méthode</span>
                      <span className="text-sm text-white">
                        {factureSelectionnee.payment.payment_method === 'pcs' ? 'Coupon PCS' : 'Cryptomonnaie'}
                      </span>
                    </div>
                    {factureSelectionnee.payment.payment_code && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Code PCS</span>
                        <span className="text-sm text-white font-mono">{factureSelectionnee.payment.payment_code}</span>
                      </div>
                    )}
                    {factureSelectionnee.payment.crypto_type && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Type de crypto</span>
                        <span className="text-sm text-white">{factureSelectionnee.payment.crypto_type}</span>
                      </div>
                    )}
                    {factureSelectionnee.payment.proof_url && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Preuve</span>
                        <a
                          href={factureSelectionnee.payment.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          Voir le justificatif
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  Articles commandés
                </h4>
                <div className="space-y-3">
                  {factureSelectionnee.items.map((item) => (
                    <div key={item.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">{item.product.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{item.product.description}</p>
                        </div>
                        <div className="text-right">
                          {item.original_price > item.unit_price ? (
                            <>
                              <p className="text-xs text-gray-400 line-through">{item.original_price.toFixed(2)}€</p>
                              <p className="text-white font-semibold">{item.unit_price.toFixed(2)}€</p>
                            </>
                          ) : (
                            <p className="text-white font-semibold">{item.unit_price.toFixed(2)}€</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400">Quantité: <span className="text-white">{item.quantity}</span></span>
                          {item.subscription_months > 1 && (
                            <span className="text-gray-400">Durée: <span className="text-white">{item.subscription_months} mois</span></span>
                          )}
                          {item.discount_percent > 0 && (
                            <span className="text-green-400">-{item.discount_percent}%</span>
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
                  <span className="text-2xl font-bold text-white">{factureSelectionnee.invoice.amount.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
