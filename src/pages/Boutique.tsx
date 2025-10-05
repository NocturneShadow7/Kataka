import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Package, Zap, Smartphone, X, Check, Search } from 'lucide-react';
import { Panier } from '../components/Panier';
import { Checkout } from './Checkout';
import { SuccessCommande } from './SuccessCommande';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock: number;
  category: string;
  category_id: string | null;
  data_limit: string | null;
  duration_days: number | null;
  status: string;
  product_type?: 'SIM' | 'Article';
}

interface SubscriptionPeriod {
  id: string;
  months: number;
  base_discount_percent: number;
  description: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  months: number;
}

interface BoutiqueProps {
  onRetour?: () => void;
  onNeedLogin?: () => void;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export function Boutique({ onRetour, onNeedLogin }: BoutiqueProps) {
  const { user } = useAuth();
  const [produits, setProduits] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subscriptionPeriods, setSubscriptionPeriods] = useState<SubscriptionPeriod[]>([]);
  const [chargement, setChargement] = useState(true);
  const [categorieSelectionnee, setCategorieSelectionnee] = useState<string>('all');
  const [rechercheTexte, setRechercheTexte] = useState<string>('');
  const [produitSelectionne, setProduitSelectionne] = useState<Product | null>(null);
  const [panier, setPanier] = useState<CartItem[]>([]);
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [vue, setVue] = useState<'boutique' | 'checkout' | 'success'>('boutique');
  const [orderId, setOrderId] = useState<string>('');
  const [modaleProduit, setModaleProduit] = useState<Product | null>(null);
  const [moisSelectionnes, setMoisSelectionnes] = useState(1);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    await Promise.all([chargerProduits(), chargerCategories(), chargerSubscriptionPeriods()]);
  };

  const chargerSubscriptionPeriods = async () => {
    const { data, error } = await supabase
      .from('subscription_periods')
      .select('*')
      .eq('is_active', true)
      .order('months');

    if (!error && data) {
      setSubscriptionPeriods(data);
    }
  };

  const chargerCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const chargerProduits = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('price');

    if (!error && data) {
      setProduits(data);
    }
    setChargement(false);
  };

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: { [key: string]: any } = {
      'Cartes SIM': Smartphone,
      'Recharges': Zap,
      'Accessoires': ShoppingCart
    };
    return iconMap[categoryName] || Package;
  };

  const produitsFiltres = produits
    .filter(p => categorieSelectionnee === 'all' || p.category_id === categorieSelectionnee)
    .filter(p =>
      rechercheTexte === '' ||
      p.name.toLowerCase().includes(rechercheTexte.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(rechercheTexte.toLowerCase()))
    );

  const ajouterAuPanier = (productId: string, months: number = 1) => {
    setPanier(prev => {
      const existing = prev.find(item => item.productId === productId && item.months === months);
      if (existing) {
        return prev.map(item =>
          item.productId === productId && item.months === months
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1, months }];
    });
  };

  const ouvrirModaleProduit = (produit: Product) => {
    setModaleProduit(produit);
    setMoisSelectionnes(1);
  };

  const confirmerAjoutPanier = () => {
    if (modaleProduit) {
      ajouterAuPanier(modaleProduit.id, moisSelectionnes);
      setProduitSelectionne(modaleProduit);
      setTimeout(() => setProduitSelectionne(null), 2000);
      setModaleProduit(null);
    }
  };

  const mettreAJourQuantite = (productId: string, months: number, quantity: number) => {
    if (quantity <= 0) {
      retirerDuPanier(productId, months);
    } else {
      setPanier(prev =>
        prev.map(item =>
          item.productId === productId && item.months === months
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const retirerDuPanier = (productId: string, months: number) => {
    setPanier(prev => prev.filter(item => !(item.productId === productId && item.months === months)));
  };

  const allerAuCheckout = () => {
    if (!user && onNeedLogin) {
      onNeedLogin();
      return;
    }
    setPanierOuvert(false);
    setVue('checkout');
  };

  const handleSuccessCommande = (newOrderId: string) => {
    setOrderId(newOrderId);
    setVue('success');
    setPanier([]);
  };

  const retourDashboard = () => {
    if (onRetour) {
      onRetour();
    }
  };

  const nombreArticlesPanier = panier.reduce((sum, item) => sum + item.quantity, 0);

  if (vue === 'checkout') {
    return (
      <Checkout
        panier={panier}
        produits={produits}
        onRetour={() => setVue('boutique')}
        onSuccess={handleSuccessCommande}
      />
    );
  }

  if (vue === 'success') {
    return (
      <SuccessCommande
        orderId={orderId}
        onRetourDashboard={retourDashboard}
      />
    );
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="fixed w-full top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              <span className="text-base md:text-xl font-bold text-white">Interkom SIM - Boutique</span>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                onClick={() => setPanierOuvert(true)}
                className="relative hover:scale-110 transition-transform"
              >
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-gray-300 hover:text-white" />
                {nombreArticlesPanier > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {nombreArticlesPanier}
                  </span>
                )}
              </button>
              {onRetour && (
                <button
                  onClick={onRetour}
                  className="px-3 md:px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Retour
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Notre Boutique</h1>
            <p className="text-lg md:text-xl text-gray-400">Découvrez nos offres de cartes SIM et recharges</p>
          </div>

          <div className="mb-6 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={rechercheTexte}
                onChange={(e) => setRechercheTexte(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
            <button
              onClick={() => setCategorieSelectionnee('all')}
              className={`flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 rounded-lg transition-all duration-200 text-sm md:text-base ${
                categorieSelectionnee === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="font-medium">Tous les produits</span>
            </button>
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategorieSelectionnee(cat.id)}
                  className={`flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 rounded-lg transition-all duration-200 text-sm md:text-base ${
                    categorieSelectionnee === cat.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {produitsFiltres.map((produit) => (
              <div
                key={produit.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="aspect-video bg-gray-700 relative overflow-hidden">
                  {produit.image_url ? (
                    <img
                      src={produit.image_url}
                      alt={produit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                  {produit.stock < 10 && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                      Stock faible
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{produit.name}</h3>
                  <p className="text-gray-400 mb-4 line-clamp-2">{produit.description}</p>

                  <div className="space-y-2 mb-4">
                    {produit.data_limit && (
                      <div className="flex items-center text-sm text-gray-300">
                        <Zap className="w-4 h-4 mr-2 text-blue-400" />
                        <span>{produit.data_limit} de data</span>
                      </div>
                    )}
                    {produit.duration_days && (
                      <div className="flex items-center text-sm text-gray-300">
                        <Check className="w-4 h-4 mr-2 text-green-400" />
                        <span>Valable {produit.duration_days} jours</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-300">
                      <Package className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{produit.stock} en stock</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white">
                      {Number(produit.price).toFixed(2)}€
                    </span>
                    <button
                      onClick={() => ouvrirModaleProduit(produit)}
                      disabled={produit.stock === 0}
                      className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                        produit.stock === 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
                      }`}
                    >
                      {produit.stock === 0 ? 'Rupture' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {produitsFiltres.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Aucun produit disponible dans cette catégorie</p>
            </div>
          )}
        </div>
      </div>

      {nombreArticlesPanier > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm text-gray-400">{nombreArticlesPanier} article(s)</p>
            </div>
            <button
              onClick={() => setPanierOuvert(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Commander
            </button>
          </div>
        </div>
      )}

      {produitSelectionne && (
        <div className="fixed bottom-24 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-up">
          <Check className="w-5 h-5" />
          <span className="font-medium">Ajouté au panier !</span>
        </div>
      )}

      {modaleProduit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{modaleProduit.name}</h3>
                  <p className="text-gray-400 text-sm">{modaleProduit.description}</p>
                </div>
                <button onClick={() => setModaleProduit(null)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {modaleProduit.product_type === 'SIM' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Durée d'abonnement
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {subscriptionPeriods.map((period) => {
                        const basePrice = Number(modaleProduit.price);
                        const totalPrice = basePrice * period.months;
                        const discountedPrice = totalPrice * (1 - period.base_discount_percent / 100);
                        const savings = totalPrice - discountedPrice;

                        return (
                          <button
                            key={period.id}
                            onClick={() => setMoisSelectionnes(period.months)}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              moisSelectionnes === period.months
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                            }`}
                          >
                            <div className="text-white font-semibold mb-1">
                              {period.months} mois
                            </div>
                            <div className="text-sm text-gray-400 mb-2">
                              {period.base_discount_percent > 0 ? (
                                <>
                                  <span className="line-through">{totalPrice.toFixed(2)}€</span>
                                  <span className="text-green-400 ml-2">{discountedPrice.toFixed(2)}€</span>
                                </>
                              ) : (
                                <span>{totalPrice.toFixed(2)}€</span>
                              )}
                            </div>
                            {period.base_discount_percent > 0 && (
                              <div className="text-xs text-green-400 font-medium">
                                Économisez {savings.toFixed(2)}€ (-{period.base_discount_percent}%)
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Package className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-200">
                        <p className="font-medium mb-1">Réductions sur quantité</p>
                        <p>Plus vous commandez de SIM, plus vous économisez jusqu'à -30% !</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <p className="text-gray-300 text-sm">
                    Prix unitaire: <span className="text-white font-semibold text-lg">{Number(modaleProduit.price).toFixed(2)}€</span>
                  </p>
                </div>
              )}

              <button
                onClick={confirmerAjoutPanier}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {panierOuvert && (
        <Panier
          panier={panier}
          produits={produits}
          subscriptionPeriods={subscriptionPeriods}
          onClose={() => setPanierOuvert(false)}
          onUpdateQuantity={mettreAJourQuantite}
          onRemove={retirerDuPanier}
          onCheckout={allerAuCheckout}
        />
      )}
    </div>
  );
}
