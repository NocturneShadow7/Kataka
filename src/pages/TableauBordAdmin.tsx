import { useState } from 'react';
import { EnTete } from '../components/EnTete';
import { GestionSims } from '../components/admin/GestionSims';
import { GestionUtilisateurs } from '../components/admin/GestionUtilisateurs';
import { GestionFactures } from '../components/admin/GestionFactures';
import { GestionProduits } from '../components/admin/GestionProduits';
import { GestionCommandes } from '../components/admin/GestionCommandes';
import { GestionPaiements } from '../components/admin/GestionPaiements';
import { GestionParametres } from '../components/admin/GestionParametres';
import { GestionAccueil } from '../components/admin/GestionAccueil';
import { GestionDemandesContact } from '../components/admin/GestionDemandesContact';
import { GestionParrainages } from '../components/admin/GestionParrainages';
import { Boutique } from './Boutique';
import { Users, CreditCard as SimIcon, FileText, Package, ShoppingCart, CreditCard, Settings, Home, Mail, Network } from 'lucide-react';

type TypeOnglet = 'sims' | 'utilisateurs' | 'factures' | 'produits' | 'commandes' | 'paiements' | 'parametres' | 'accueil' | 'demandes' | 'parrainages';

interface TableauBordAdminProps {
  onAccueil?: () => void;
  onBoutique?: () => void;
}

export function TableauBordAdmin({ onAccueil, onBoutique }: TableauBordAdminProps) {
  const [ongletActif, setOngletActif] = useState<TypeOnglet>('sims');
  const [afficherBoutique, setAfficherBoutique] = useState(false);

  if (afficherBoutique) {
    return <Boutique onRetour={() => setAfficherBoutique(false)} />;
  }

  const onglets = [
    { id: 'sims' as TypeOnglet, nom: 'Cartes SIM', icone: SimIcon },
    { id: 'utilisateurs' as TypeOnglet, nom: 'Utilisateurs', icone: Users },
    { id: 'factures' as TypeOnglet, nom: 'Factures', icone: FileText },
    { id: 'produits' as TypeOnglet, nom: 'Produits', icone: Package },
    { id: 'commandes' as TypeOnglet, nom: 'Commandes', icone: ShoppingCart },
    { id: 'paiements' as TypeOnglet, nom: 'Paiements', icone: CreditCard },
    { id: 'demandes' as TypeOnglet, nom: 'Demandes', icone: Mail },
    { id: 'parrainages' as TypeOnglet, nom: 'Parrainages', icone: Network },
    { id: 'accueil' as TypeOnglet, nom: 'Accueil', icone: Home },
    { id: 'parametres' as TypeOnglet, nom: 'Paramètres', icone: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <EnTete
        onAccueil={onAccueil}
        onBoutique={onBoutique || (() => setAfficherBoutique(true))}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Tableau de Bord Administrateur</h2>
          <p className="text-sm sm:text-base text-gray-400">Gérez vos cartes SIM, utilisateurs et commandes</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
          <div className="border-b border-gray-700 overflow-x-auto">
            <nav className="flex space-x-1 p-2 min-w-max" aria-label="Onglets">
              {onglets.map((onglet) => {
                const Icone = onglet.icone;
                return (
                  <button
                    key={onglet.id}
                    onClick={() => setOngletActif(onglet.id)}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      ongletActif === onglet.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icone className="w-4 h-4" />
                    <span className="hidden sm:inline">{onglet.nom}</span>
                    <span className="sm:hidden">{onglet.nom.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {ongletActif === 'sims' && <GestionSims />}
            {ongletActif === 'utilisateurs' && <GestionUtilisateurs />}
            {ongletActif === 'factures' && <GestionFactures />}
            {ongletActif === 'produits' && <GestionProduits />}
            {ongletActif === 'commandes' && <GestionCommandes />}
            {ongletActif === 'paiements' && <GestionPaiements />}
            {ongletActif === 'demandes' && <GestionDemandesContact />}
            {ongletActif === 'parrainages' && <GestionParrainages />}
            {ongletActif === 'accueil' && <GestionAccueil />}
            {ongletActif === 'parametres' && <GestionParametres />}
          </div>
        </div>
      </div>
    </div>
  );
}
