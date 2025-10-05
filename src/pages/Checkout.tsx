import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, CreditCard, Bitcoin, ArrowLeft, Check, Tag, Upload, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculateCartTotal } from '../lib/discounts';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock: number;
  data_limit: string | null;
  duration_days: number | null;
  product_type?: 'SIM' | 'Article';
}

interface CartItem {
  productId: string;
  quantity: number;
  months: number;
}

interface SubscriptionPeriod {
  id: string;
  months: number;
  base_discount_percent: number;
  description: string;
}

interface CheckoutProps {
  panier: CartItem[];
  produits: Product[];
  onRetour: () => void;
  onSuccess: (orderId: string) => void;
}

export function Checkout({ panier, produits, onRetour, onSuccess }: CheckoutProps) {
  const { user } = useAuth();
  const [profil, setProfil] = useState<any>(null);
  const [subscriptionPeriods, setSubscriptionPeriods] = useState<SubscriptionPeriod[]>([]);
  const [etape, setEtape] = useState<'recap' | 'paiement'>('recap');
  const [methodePaiement, setMethodePaiement] = useState<'pcs' | 'crypto' | null>(null);
  const [codePCS, setCodePCS] = useState('PCS-');
  const [cryptoAsset, setCryptoAsset] = useState<'BTC' | 'ETH' | 'USDT-TRON'>('BTC');
  const [txHash, setTxHash] = useState('');
  const [preuve, setPreuve] = useState('');
  const [preuveFile, setPreuveFile] = useState<File | null>(null);
  const [preuvePreview, setPreuvePreview] = useState<string>('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [cryptoAddresses, setCryptoAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    chargerProfil();
    chargerSubscriptionPeriods();
    chargerCryptoAddresses();
  }, [user]);

  const chargerCryptoAddresses = async () => {
    const { data } = await supabase
      .from('crypto_wallets')
      .select('crypto_type, address')
      .eq('is_active', true);

    if (data) {
      const addresses: Record<string, string> = {};
      data.forEach(wallet => {
        addresses[wallet.crypto_type] = wallet.address;
      });
      setCryptoAddresses(addresses);
    }
  };

  const chargerSubscriptionPeriods = async () => {
    const { data } = await supabase
      .from('subscription_periods')
      .select('*')
      .eq('is_active', true)
      .order('months');

    if (data) {
      setSubscriptionPeriods(data);
    }
  };

  const chargerProfil = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfil(data);
    }
  };

  const articlesPanier = panier.map(item => ({
    ...item,
    produit: produits.find(p => p.id === item.productId),
    period: subscriptionPeriods.find(p => p.months === item.months)
  })).filter(item => item.produit);

  const cartCalculation = calculateCartTotal(
    articlesPanier.map(item => ({
      basePrice: Number(item.produit!.price),
      months: item.months,
      subscriptionDiscount: item.period?.base_discount_percent || 0,
      quantity: item.quantity,
      isSIM: item.produit!.product_type === 'SIM'
    }))
  );

  const total = cartCalculation.finalTotal;

  const creerCommande = async () => {
    if (!user) return null;

    setChargement(true);
    setErreur('');

    try {
      const orderNumber = `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          client_id: user.id,
          product_id: articlesPanier[0].produit!.id,
          status: 'pending',
          total_amount: total
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = articlesPanier.map((item, index) => {
        const itemCalc = cartCalculation.items[index];
        return {
          order_id: order.id,
          product_id: item.produit!.id,
          quantity: item.quantity,
          unit_price: itemCalc.finalPrice,
          subtotal: itemCalc.finalPrice * item.quantity,
          subscription_months: item.months,
          discount_percent: itemCalc.totalDiscount,
          original_price: itemCalc.originalPrice
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          client_id: user.id,
          order_id: order.id,
          amount: total,
          status: 'draft',
          due_date: dueDate.toISOString().split('T')[0]
        });

      if (invoiceError) throw invoiceError;

      return order.id;
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors de la création de la commande');
      return null;
    } finally {
      setChargement(false);
    }
  };

  const uploadProofImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const soumettrePaymentPCS = async () => {
    const pcsRegex = /^PCS-\d{10}$/;
    if (!pcsRegex.test(codePCS)) {
      setErreur('Format de code PCS invalide. Format attendu: PCS-1234567890');
      return;
    }

    if (!preuveFile && !preuve) {
      setErreur('La preuve de paiement est obligatoire pour les paiements PCS');
      return;
    }

    const orderId = await creerCommande();
    if (!orderId) return;

    try {
      let proofUrl = preuve || null;

      if (preuveFile) {
        const uploadedUrl = await uploadProofImage(preuveFile);
        if (uploadedUrl) {
          proofUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          payment_method: 'pcs',
          payment_code: codePCS,
          proof_url: proofUrl,
          status: 'pending'
        });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'pending' })
        .eq('order_id', orderId);

      if (updateError) throw updateError;

      onSuccess(orderId);
    } catch (err: any) {
      if (err.code === '23505') {
        setErreur('Ce code PCS a déjà été utilisé');
      } else {
        setErreur(err.message || 'Erreur lors du paiement');
      }
    }
  };

  const soumettrePaymentCrypto = async () => {
    const orderId = await creerCommande();
    if (!orderId) return;

    try {
      let proofUrl = preuve || null;

      if (preuveFile) {
        const uploadedUrl = await uploadProofImage(preuveFile);
        if (uploadedUrl) {
          proofUrl = uploadedUrl;
        }
      }

      const cryptoAddress = cryptoAddresses[cryptoAsset];
      if (!cryptoAddress) {
        throw new Error('Adresse crypto non disponible');
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          payment_method: 'crypto',
          crypto_type: cryptoAsset,
          crypto_address: txHash || null,
          proof_url: proofUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('crypto_payment_checks')
        .insert({
          payment_id: payment.id,
          expected_amount: total,
          crypto_address: cryptoAddress,
          crypto_type: cryptoAsset,
          status: 'pending'
        });

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'pending' })
        .eq('order_id', orderId);

      if (updateError) throw updateError;

      onSuccess(orderId);
    } catch (err: any) {
      setErreur(err.message || 'Erreur lors du paiement');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErreur('La taille du fichier ne doit pas dépasser 5 MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setErreur('Veuillez sélectionner une image valide');
        return;
      }

      setPreuveFile(file);
      setPreuve('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreuvePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setPreuveFile(null);
    setPreuvePreview('');
  };

  const adressesCrypto = cryptoAddresses;

  if (etape === 'recap') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onRetour}
            className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la boutique</span>
          </button>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-700">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8" />
                <span>Récapitulatif de commande</span>
              </h1>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Informations client</h2>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-300">
                    <span className="text-gray-400">Nom:</span> {profil?.full_name || 'Chargement...'}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-400">Email:</span> {user?.email}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Articles commandés</h2>
                <div className="space-y-3">
                  {articlesPanier.map(({ produit, quantity, months, period }, index) => {
                    if (!produit) return null;
                    const itemCalc = cartCalculation.items[index];
                    return (
                      <div key={`${produit.id}-${months}`} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-white font-medium">{produit.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
                              <Tag className="w-3 h-3" />
                              <span>{months} mois</span>
                              {period && period.base_discount_percent > 0 && (
                                <span className="text-green-400">(-{period.base_discount_percent}%)</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Quantité: {quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            {itemCalc.originalPrice > itemCalc.finalPrice ? (
                              <>
                                <div className="text-sm text-gray-400 line-through">
                                  {(itemCalc.originalPrice * quantity).toFixed(2)}€
                                </div>
                                <div className="text-xl font-bold text-green-400">
                                  {(itemCalc.finalPrice * quantity).toFixed(2)}€
                                </div>
                              </>
                            ) : (
                              <span className="text-xl font-bold text-white">
                                {(itemCalc.finalPrice * quantity).toFixed(2)}€
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                {cartCalculation.totalSaved > 0 && (
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Total avant réductions</span>
                      <span className="line-through">{cartCalculation.originalTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-400 font-medium">
                      <span>Économies réalisées</span>
                      <span>-{cartCalculation.totalSaved.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-2xl font-semibold text-gray-300">Total</span>
                  <span className="text-3xl font-bold text-white">{total.toFixed(2)}€</span>
                </div>

                <button
                  onClick={() => setEtape('paiement')}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-lg"
                >
                  Procéder au paiement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setEtape('recap')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour au récapitulatif</span>
        </button>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <CreditCard className="w-8 h-8" />
              <span>Paiement - {total.toFixed(2)}€</span>
            </h1>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Choisissez votre méthode de paiement</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMethodePaiement('pcs')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    methodePaiement === 'pcs'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                  }`}
                >
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-white" />
                  <h3 className="text-white font-semibold text-lg">Paiement PCS</h3>
                  <p className="text-sm text-gray-400 mt-2">Code de paiement sécurisé</p>
                </button>

                <button
                  onClick={() => setMethodePaiement('crypto')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    methodePaiement === 'crypto'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                  }`}
                >
                  <Bitcoin className="w-12 h-12 mx-auto mb-3 text-white" />
                  <h3 className="text-white font-semibold text-lg">Crypto</h3>
                  <p className="text-sm text-gray-400 mt-2">BTC, ETH, USDT-TRON</p>
                </button>
              </div>
            </div>

            {erreur && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
                <p className="text-red-200">{erreur}</p>
              </div>
            )}

            {methodePaiement === 'pcs' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Code PCS *
                  </label>
                  <input
                    type="text"
                    value={codePCS}
                    onChange={(e) => setCodePCS(e.target.value)}
                    placeholder="PCS-1234567890"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Format: PCS-XXXXXXXXXX (10 chiffres)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preuve de paiement *
                  </label>

                  {!preuveFile && !preuve && (
                    <div className="space-y-3">
                      <label className="block">
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-400 mb-1">Cliquez pour télécharger une image</p>
                          <p className="text-xs text-gray-500">PNG, JPG jusqu'à 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1 border-t border-gray-600"></div>
                        <span className="text-xs text-gray-500">OU</span>
                        <div className="flex-1 border-t border-gray-600"></div>
                      </div>

                      <input
                        type="url"
                        value={preuve}
                        onChange={(e) => setPreuve(e.target.value)}
                        placeholder="URL de l'image..."
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {preuveFile && preuvePreview && (
                    <div className="relative">
                      <img
                        src={preuvePreview}
                        alt="Aperçu"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-400 mt-2">{preuveFile.name}</p>
                    </div>
                  )}

                  {preuve && !preuveFile && (
                    <div className="relative">
                      <input
                        type="url"
                        value={preuve}
                        onChange={(e) => setPreuve(e.target.value)}
                        placeholder="URL de l'image..."
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPreuve('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={soumettrePaymentPCS}
                  disabled={chargement || (!preuveFile && !preuve)}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-lg"
                >
                  {chargement ? 'Traitement...' : 'Valider le paiement PCS'}
                </button>
              </div>
            )}

            {methodePaiement === 'crypto' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cryptomonnaie *
                  </label>
                  <select
                    value={cryptoAsset}
                    onChange={(e) => setCryptoAsset(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="USDT-TRON">USDT-TRON</option>
                  </select>
                </div>

                <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-blue-300 mb-1">Adresse de paiement:</p>
                      <p className="text-white font-mono text-xs sm:text-sm break-all">{adressesCrypto[cryptoAsset] || 'Chargement...'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-3 mt-2">
                    <p className="text-xs text-gray-400">Montant à envoyer: <span className="text-white font-semibold">{total.toFixed(2)}€</span> équivalent en {cryptoAsset}</p>
                    <p className="text-xs text-yellow-400 mt-2">⚠️ Le paiement sera détecté automatiquement une fois la transaction confirmée</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hash de transaction (optionnel)
                  </label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preuve de paiement (optionnel)
                  </label>

                  {!preuveFile && !preuve && (
                    <div className="space-y-3">
                      <label className="block">
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-400 mb-1">Cliquez pour télécharger une image</p>
                          <p className="text-xs text-gray-500">PNG, JPG jusqu'à 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1 border-t border-gray-600"></div>
                        <span className="text-xs text-gray-500">OU</span>
                        <div className="flex-1 border-t border-gray-600"></div>
                      </div>

                      <input
                        type="url"
                        value={preuve}
                        onChange={(e) => setPreuve(e.target.value)}
                        placeholder="URL de l'image..."
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {preuveFile && preuvePreview && (
                    <div className="relative">
                      <img
                        src={preuvePreview}
                        alt="Aperçu"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-gray-400 mt-2">{preuveFile.name}</p>
                    </div>
                  )}

                  {preuve && !preuveFile && (
                    <div className="relative">
                      <input
                        type="url"
                        value={preuve}
                        onChange={(e) => setPreuve(e.target.value)}
                        placeholder="URL de l'image..."
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPreuve('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={soumettrePaymentCrypto}
                  disabled={chargement}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors text-lg"
                >
                  {chargement ? 'Traitement...' : 'Valider le paiement Crypto'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
