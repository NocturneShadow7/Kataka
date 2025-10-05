import { useState, useEffect } from 'react';
import { Check, Clock, CreditCard, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SuccessCommandeProps {
  orderId: string;
  onRetourDashboard: () => void;
}

interface OrderDetails {
  order_number: string;
  total_amount: number;
  created_at: string;
  invoice?: {
    invoice_number: string;
    amount: number;
    status: string;
    due_date: string;
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
  };
}

export function SuccessCommande({ orderId, onRetourDashboard }: SuccessCommandeProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [chargement, setChargement] = useState(true);
  const [verificationEnCours, setVerificationEnCours] = useState(false);

  useEffect(() => {
    chargerDetailsCommande();
    const interval = setInterval(chargerDetailsCommande, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const chargerDetailsCommande = async () => {
    const { data: order } = await supabase
      .from('orders')
      .select(`
        order_number,
        total_amount,
        created_at
      `)
      .eq('id', orderId)
      .single();

    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, amount, status, due_date')
      .eq('order_id', orderId)
      .maybeSingle();

    const { data: payment } = await supabase
      .from('payments')
      .select('payment_method, status')
      .eq('order_id', orderId)
      .maybeSingle();

    let cryptoCheck = null;
    if (payment?.payment_method === 'crypto') {
      const { data: check } = await supabase
        .from('crypto_payment_checks')
        .select('status, received_amount, expected_amount, crypto_address')
        .eq('payment_id', payment.id)
        .maybeSingle();
      cryptoCheck = check;
    }

    if (order) {
      setOrderDetails({
        ...order,
        invoice: invoice || undefined,
        payment: payment || undefined,
        crypto_check: cryptoCheck || undefined
      });
    }
    setChargement(false);
  };

  if (chargement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-500" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">Commande enregistrée !</h1>
            <p className="text-xl text-gray-300 mb-8">
              Votre commande a été créée avec succès
            </p>

            {orderDetails?.crypto_check && (
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  {orderDetails.crypto_check.status === 'confirmed' ? (
                    <Check className="w-6 h-6 text-green-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-blue-400 animate-spin" />
                  )}
                  <span className="text-lg font-semibold text-white">
                    {orderDetails.crypto_check.status === 'confirmed' ? 'Paiement confirmé !' :
                     orderDetails.crypto_check.status === 'underpaid' ? 'Montant insuffisant' :
                     'Vérification automatique en cours...'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  {orderDetails.crypto_check.status === 'confirmed' ? (
                    'Votre paiement crypto a été détecté et confirmé automatiquement.'
                  ) : orderDetails.crypto_check.status === 'underpaid' ? (
                    `Montant reçu: ${orderDetails.crypto_check.received_amount}€ / ${orderDetails.crypto_check.expected_amount}€ attendus`
                  ) : (
                    'Le système vérifie automatiquement les transactions blockchain toutes les minutes.'
                  )}
                </p>
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-400">Adresse de paiement:</p>
                  <p className="text-white font-mono text-xs break-all mt-1">{orderDetails.crypto_check.crypto_address}</p>
                </div>
              </div>
            )}

            {!orderDetails?.crypto_check && (
              <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Clock className="w-6 h-6 text-yellow-500" />
                  <span className="text-lg font-semibold text-white">En attente de validation</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Votre paiement est en cours de vérification par notre équipe.
                  Vous recevrez une notification dès validation.
                </p>
              </div>
            )}

            <div className="space-y-3 mb-8">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Numéro de commande</p>
                <p className="text-white font-mono">{orderDetails?.order_number || orderId}</p>
              </div>

              {orderDetails?.invoice && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <p className="text-sm text-gray-400">Facture</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      orderDetails.invoice.status === 'paid'
                        ? 'bg-green-900/50 text-green-300'
                        : orderDetails.invoice.status === 'pending'
                        ? 'bg-yellow-900/50 text-yellow-300'
                        : 'bg-red-900/50 text-red-300'
                    }`}>
                      {orderDetails.invoice.status === 'paid' ? 'Payée' :
                       orderDetails.invoice.status === 'pending' ? 'En attente' : 'Impayée'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Numéro</span>
                      <span className="text-white font-mono text-sm">{orderDetails.invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Montant</span>
                      <span className="text-white font-semibold">{orderDetails.invoice.amount.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Échéance</span>
                      <span className="text-white text-sm">
                        {new Date(orderDetails.invoice.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-blue-200 font-medium mb-1">Prochaines étapes</p>
                    <ul className="text-sm text-blue-300 space-y-1">
                      <li>• Notre équipe vérifie votre paiement</li>
                      <li>• Une fois validé, vos SIM seront activées</li>
                      <li>• Vous pourrez consulter vos SIM dans votre espace client</li>
                      <li>• Une facture sera générée automatiquement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onRetourDashboard}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-lg"
            >
              Retour à mon espace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
