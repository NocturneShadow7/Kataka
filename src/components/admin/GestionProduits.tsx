import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, X, Tag, Smartphone, Search } from 'lucide-react';
import { GestionCategories } from './GestionCategories';
import { GestionForfaitsSim } from './GestionForfaitsSim';

interface Produit {
  id: string;
  name: string;
  description: string;
  price: number;
  data_limit: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  category_id: string | null;
  product_type: 'SIM' | 'Article';
  image_url?: string | null;
}

interface Categorie {
  id: string;
  name: string;
  description: string | null;
}

export function GestionProduits() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [produitEnEdition, setProduitEnEdition] = useState<Produit | null>(null);
  const [ongletActif, setOngletActif] = useState<'produits' | 'categories' | 'forfaits'>('produits');
  const [categorieFiltre, setCategorieFiltre] = useState<string>('all');
  const [typeFiltre, setTypeFiltre] = useState<string>('all');
  const [rechercheTexte, setRechercheTexte] = useState<string>('');
  const [formulaire, setFormulaire] = useState({
    name: '',
    description: '',
    price: 0,
    data_limit: '',
    duration_days: 30,
    is_active: true,
    category_id: '',
    product_type: 'Article' as 'SIM' | 'Article',
    image_url: ''
  });

  useEffect(() => {
    chargerProduits();
    chargerCategories();
  }, []);

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
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProduits(data);
    }
    setChargement(false);
  };

  const ouvrirModale = (produit?: Produit) => {
    if (produit) {
      setProduitEnEdition(produit);
      setFormulaire({
        name: produit.name,
        description: produit.description,
        price: produit.price,
        data_limit: produit.data_limit,
        duration_days: produit.duration_days,
        is_active: produit.is_active,
        category_id: produit.category_id || '',
        product_type: produit.product_type || 'Article',
        image_url: produit.image_url || ''
      });
    } else {
      setProduitEnEdition(null);
      setFormulaire({
        name: '',
        description: '',
        price: 0,
        data_limit: '',
        duration_days: 30,
        is_active: true,
        category_id: '',
        product_type: 'Article',
        image_url: ''
      });
    }
    setModaleOuverte(true);
  };

  const fermerModale = () => {
    setModaleOuverte(false);
    setProduitEnEdition(null);
  };

  const sauvegarder = async () => {
    if (!formulaire.name || !formulaire.description) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const donnees = {
      name: formulaire.name,
      description: formulaire.description,
      price: formulaire.price,
      data_limit: formulaire.data_limit,
      duration_days: formulaire.duration_days,
      is_active: formulaire.is_active,
      category_id: formulaire.category_id || null
    };

    if (produitEnEdition) {
      const { error } = await supabase.from('products').update(donnees).eq('id', produitEnEdition.id);
      if (error) {
        alert('Erreur lors de la modification: ' + error.message);
        return;
      }
      alert('Produit modifié avec succès');
    } else {
      const { error } = await supabase.from('products').insert(donnees);
      if (error) {
        alert('Erreur lors de la création: ' + error.message);
        return;
      }
      alert('Produit créé avec succès');
    }

    fermerModale();
    chargerProduits();
  };

  const supprimerProduit = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
      return;
    }

    alert('Produit supprimé avec succès');
    chargerProduits();
  };

  const basculerActif = async (id: string, statutActuel: boolean) => {
    await supabase.from('products').update({ is_active: !statutActuel }).eq('id', id);
    chargerProduits();
  };

  if (chargement) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex space-x-4 border-b border-gray-700">
          <button
            onClick={() => setOngletActif('produits')}
            className={`px-4 py-2 font-medium transition-colors ${
              ongletActif === 'produits'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Produits
          </button>
          <button
            onClick={() => setOngletActif('categories')}
            className={`px-4 py-2 font-medium transition-colors flex items-center space-x-2 ${
              ongletActif === 'categories'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Catégories</span>
          </button>
          <button
            onClick={() => setOngletActif('forfaits')}
            className={`px-4 py-2 font-medium transition-colors flex items-center space-x-2 ${
              ongletActif === 'forfaits'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Forfaits SIM</span>
          </button>
        </div>
      </div>

      {ongletActif === 'categories' && <GestionCategories />}
      {ongletActif === 'forfaits' && <GestionForfaitsSim />}
      {ongletActif === 'produits' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Gestion des produits</h3>
            <button
              onClick={() => ouvrirModale()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau produit</span>
            </button>
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={rechercheTexte}
                onChange={(e) => setRechercheTexte(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filtrer par catégorie
              </label>
              <select
                value={categorieFiltre}
                onChange={(e) => setCategorieFiltre(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filtrer par type
              </label>
              <select
                value={typeFiltre}
                onChange={(e) => setTypeFiltre(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Tous les types</option>
                <option value="SIM">SIM</option>
                <option value="Article">Article</option>
              </select>
            </div>
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {produits
          .filter((p) => categorieFiltre === 'all' || p.category_id === categorieFiltre)
          .filter((p) => typeFiltre === 'all' || p.product_type === typeFiltre)
          .filter((p) =>
            rechercheTexte === '' ||
            p.name.toLowerCase().includes(rechercheTexte.toLowerCase()) ||
            p.description.toLowerCase().includes(rechercheTexte.toLowerCase())
          )
          .map((produit) => (
          <div
            key={produit.id}
            className="bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
          >
            {produit.image_url && (
              <div className="aspect-video bg-gray-800 relative overflow-hidden">
                <img
                  src={produit.image_url}
                  alt={produit.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-semibold text-white">{produit.name}</h4>
                <button
                  onClick={() => basculerActif(produit.id, produit.is_active)}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    produit.is_active
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  {produit.is_active ? 'Actif' : 'Inactif'}
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-4">{produit.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Type:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  produit.product_type === 'SIM'
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {produit.product_type}
                </span>
              </div>
              {produit.category_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Catégorie:</span>
                  <span className="text-white">
                    {categories.find(c => c.id === produit.category_id)?.name || '-'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Prix:</span>
                <span className="text-white font-semibold">{produit.price}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Data:</span>
                <span className="text-white">{produit.data_limit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Durée:</span>
                <span className="text-white">{produit.duration_days} jours</span>
              </div>
            </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => ouvrirModale(produit)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm">Modifier</span>
                </button>
                <button
                  onClick={() => supprimerProduit(produit.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">
                {produitEnEdition ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <button onClick={fermerModale} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  value={formulaire.name}
                  onChange={(e) => setFormulaire({ ...formulaire, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Forfait 50GB"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formulaire.description}
                  onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Description du forfait..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prix (€) *
                  </label>
                  <input
                    type="number"
                    value={formulaire.price}
                    onChange={(e) => setFormulaire({ ...formulaire, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Durée (jours) *
                  </label>
                  <input
                    type="number"
                    value={formulaire.duration_days}
                    onChange={(e) => setFormulaire({ ...formulaire, duration_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Limite data *
                </label>
                <input
                  type="text"
                  value={formulaire.data_limit}
                  onChange={(e) => setFormulaire({ ...formulaire, data_limit: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ex: 50GB, Illimité"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type de produit *
                </label>
                <select
                  value={formulaire.product_type}
                  onChange={(e) => setFormulaire({ ...formulaire, product_type: e.target.value as 'SIM' | 'Article' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Article">Article</option>
                  <option value="SIM">SIM</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Les produits de type "SIM" bénéficient des réductions sur quantité et durée
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Catégorie
                </label>
                <select
                  value={formulaire.category_id}
                  onChange={(e) => setFormulaire({ ...formulaire, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Aucune catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL de l'image
                </label>
                <input
                  type="text"
                  value={formulaire.image_url}
                  onChange={(e) => setFormulaire({ ...formulaire, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="https://exemple.com/image.jpg"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Laisser vide pour utiliser l'image par défaut
                </p>
                {formulaire.image_url && (
                  <div className="mt-2">
                    <img
                      src={formulaire.image_url}
                      alt="Aperçu"
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.alt = 'Image invalide';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formulaire.is_active}
                  onChange={(e) => setFormulaire({ ...formulaire, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
                  Produit actif
                </label>
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
                {produitEnEdition ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
