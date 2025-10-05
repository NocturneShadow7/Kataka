# Interkom - Gestion de Cartes SIM 4G

Application web complète de gestion de cartes SIM 4G avec système d'authentification, tableaux de bord admin et client, gestion des paiements et facturation.

## Fonctionnalités

### Authentification
- Connexion sécurisée avec gestion des rôles (Admin/Client)
- Vérification des mots de passe via Edge Function Supabase

### Tableau de Bord Administrateur
- **Cartes SIM**: Gestion complète des cartes SIM
- **Utilisateurs**: Gestion des comptes admin et clients
- **Factures**: Suivi des factures avec statuts
- **Produits**: Catalogue de forfaits SIM
- **Commandes**: Traitement des commandes
- **Paiements**: Validation des paiements PCS et crypto

### Tableau de Bord Client
- Visualisation des cartes SIM actives
- Suivi des factures et paiements
- Statistiques en temps réel
- Interface d'achat de nouvelles cartes SIM

## Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Base de données**: Supabase (PostgreSQL)
- **Edge Functions**: Supabase (Deno)
- **Icônes**: Lucide React
- **Gestionnaire de paquets**: pnpm

## Installation locale

### Prérequis
- Node.js 18+
- pnpm 8+

### Installation

```bash
# Cloner le repository
git clone https://votre-repo.git
cd interkom

# Installer les dépendances
pnpm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos clés Supabase
nano .env
```

### Configuration

Créez un fichier `.env` avec:

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

### Développement

```bash
# Lancer le serveur de développement
pnpm dev
```

L'application sera accessible sur `http://localhost:5173`

### Production

```bash
# Builder l'application
pnpm build

# Prévisualiser le build
pnpm preview
```

## Déploiement sur VPS

Consultez le fichier [DEPLOIEMENT.md](./DEPLOIEMENT.md) pour un guide complet de déploiement sur un VPS Debian 13 avec nginx.

### Résumé rapide

1. Installer Node.js, pnpm et nginx sur le serveur
2. Transférer les fichiers du projet
3. Configurer les variables d'environnement
4. Builder l'application avec `pnpm build`
5. Configurer nginx avec le fichier `nginx.conf` fourni
6. Optionnel: Configurer SSL avec Let's Encrypt

## Structure du projet

```
interkom/
├── src/
│   ├── components/         # Composants React
│   │   ├── admin/         # Composants admin
│   │   ├── EnTete.tsx
│   │   └── FormulaireConnexion.tsx
│   ├── contexts/          # Contextes React
│   │   └── AuthContext.tsx
│   ├── lib/               # Utilitaires
│   │   ├── auth.ts
│   │   └── supabase.ts
│   ├── pages/             # Pages principales
│   │   ├── TableauBordAdmin.tsx
│   │   └── TableauBordClient.tsx
│   ├── App.tsx            # Composant principal
│   └── main.tsx           # Point d'entrée
├── supabase/
│   └── functions/         # Edge Functions
│       └── auth-login/    # Fonction d'authentification
├── public/                # Assets statiques
├── nginx.conf            # Config nginx HTTP
├── nginx-ssl.conf        # Config nginx HTTPS
├── update-interkom.sh    # Script de mise à jour
├── DEPLOIEMENT.md        # Guide de déploiement
└── package.json          # Dépendances

```

## Base de données

### Tables Supabase

- `users` - Utilisateurs (admin/client)
- `sims` - Cartes SIM
- `products` - Produits/Forfaits
- `orders` - Commandes
- `invoices` - Factures
- `payments` - Paiements

### Row Level Security (RLS)

Toutes les tables sont protégées avec RLS activé:
- Les clients peuvent uniquement voir leurs propres données
- Les admins ont accès à toutes les données

### Edge Functions

- `auth-login` - Authentification avec vérification bcrypt

## Identifiants de test

**Administrateur**
- Email: `admin@interkom.local`
- Mot de passe: `admin123`

**Client**
- Email: `client@interkom.local`
- Mot de passe: `client123`

## Scripts disponibles

```bash
# Développement
pnpm dev

# Build production
pnpm build

# Prévisualisation
pnpm preview

# Linter
pnpm lint

# Vérification des types
pnpm typecheck
```

## Sécurité

- Authentification sécurisée via Edge Function
- Mots de passe hashés avec bcrypt
- Row Level Security sur toutes les tables
- Protection CSRF et XSS
- Headers de sécurité configurés dans nginx

## Support

Pour toute question ou problème:
- Consultez le fichier [DEPLOIEMENT.md](./DEPLOIEMENT.md)
- Vérifiez les logs nginx: `sudo tail -f /var/log/nginx/error.log`
- Documentation Supabase: https://supabase.com/docs

## Licence

Propriétaire - Tous droits réservés

---

Développé avec React + TypeScript + Supabase
