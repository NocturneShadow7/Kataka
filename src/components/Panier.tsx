import { X, Plus, Minus, Trash2, ShoppingBag, Tag, TrendingDown } from 'lucide-react';
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

interface PanierProps {
  panier: CartItem[];
  produits: Product[];
  subscriptionPeriods: SubscriptionPeriod[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, months: number, quantity: number) => void;
  onRemove: (productId: string, months: number) => void;
  onCheckout: () => void;
}

export function Panier({ panier, produits, subscriptionPeriods, onClose, onUpdateQuantity, onRemove, onCheckout }: PanierProps) {
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

  const nombreArticles = panier.reduce((sum, item) => sum + item.quantity, 0);
  const hasDiscount = cartCalculation.totalSaved > 0;

  if (nombreArticles === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
          <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <ShoppingBag className="w-6 h-6" />
              <span>Votre Panier</span>
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Votre panier est vide</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6" />
            <span>Votre Panier ({nombreArticles})</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {articlesPanier.map(({ productId, quantity, months, produit, period }, index) => {
            if (!produit) return null;

            const itemCalc = cartCalculation.items[index];
            const basePrice = Number(produit.price);
            const monthlyTotal = basePrice * months;

            return (
              <div key={`${productId}-${months}`} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                    {produit.image_url ? (
                      <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{produit.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Tag className="w-3 h-3" />
                          <span>{months} mois</span>
                          {period && period.base_discount_percent > 0 && (
                            <span className="text-green-400">(-{period.base_discount_percent}%)</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(productId, months)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {produit.data_limit && (
                      <p className="text-xs text-gray-500 mb-2">{produit.data_limit} de data</p>
                    )}

                    {itemCalc && itemCalc.totalDiscount > 0 && (
                      <div className="bg-green-900/20 border border-green-700/50 rounded px-2 py-1 mb-2 inline-block">
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <TrendingDown className="w-3 h-3" />
                          <span>Réduction totale: -{itemCalc.totalDiscount.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onUpdateQuantity(productId, months, Math.max(1, quantity - 1))}
                          className="w-8 h-8 rounded-lg bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-white font-medium w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(productId, months, Math.min(produit.stock, quantity + 1))}
                          disabled={quantity >= produit.stock}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            quantity >= produit.stock
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        {itemCalc && itemCalc.originalPrice > itemCalc.finalPrice ? (
                          <>
                            <div className="text-sm text-gray-400 line-through">
                              {(itemCalc.originalPrice * quantity).toFixed(2)}€
                            </div>
                            <div className="text-xl font-bold text-green-400">
                              {(itemCalc.finalPrice * quantity).toFixed(2)}€
                            </div>
                          </>
                        ) : (
                          <div className="text-xl font-bold text-white">
                            {(monthlyTotal * quantity).toFixed(2)}€
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-700 p-6 bg-gray-750">
          {hasDiscount && (
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

          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-semibold text-gray-300">Total</span>
            <span className="text-3xl font-bold text-white">{cartCalculation.finalTotal.toFixed(2)}€</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Continuer
            </button>
            <button
              onClick={onCheckout}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Commander
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
