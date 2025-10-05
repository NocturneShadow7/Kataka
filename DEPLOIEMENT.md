# Guide de Déploiement Interkom sur VPS Debian 13

Ce guide vous explique comment déployer l'application Interkom sur un VPS Debian 13 avec nginx et pnpm.

## Prérequis

- Un VPS Debian 13
- Accès SSH (via PuTTY)
- Un nom de domaine pointant vers votre VPS
- Variables d'environnement Supabase

## Étape 1: Connexion au VPS via PuTTY

1. Ouvrez PuTTY
2. Entrez l'adresse IP de votre VPS
3. Port: 22
4. Cliquez sur "Open"
5. Connectez-vous avec vos identifiants

## Étape 2: Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

## Étape 3: Installation de Node.js et pnpm

```bash
# Installer Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier l'installation
node --version
npm --version

# Installer pnpm globalement
sudo npm install -g pnpm

# Vérifier pnpm
pnpm --version
```

## Étape 4: Installation de nginx

```bash
# Installer nginx
sudo apt install -y nginx

# Démarrer et activer nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier le statut
sudo systemctl status nginx
```

## Étape 5: Configuration du pare-feu

```bash
# Autoriser HTTP et HTTPS
sudo apt install -y ufw
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Étape 6: Cloner ou transférer le projet

### Option A: Via Git (recommandé)

```bash
# Installer git si nécessaire
sudo apt install -y git

# Créer le répertoire
sudo mkdir -p /var/www/interkom
sudo chown -R $USER:$USER /var/www/interkom

# Cloner le projet (remplacez par votre repository)
cd /var/www
git clone https://votre-repo.git interkom
cd interkom
```

### Option B: Transfert via SFTP/SCP depuis votre PC

Utilisez WinSCP ou FileZilla pour transférer les fichiers:

1. Connectez-vous à votre VPS
2. Créez le dossier `/var/www/interkom`
3. Transférez tous les fichiers du projet dans ce dossier

## Étape 7: Configuration des variables d'environnement

```bash
cd /var/www/interkom

# Créer le fichier .env
nano .env
```

Ajoutez le contenu suivant (remplacez par vos vraies valeurs Supabase):

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-supabase
```

Sauvegardez avec `Ctrl+X`, puis `Y`, puis `Entrée`.

## Étape 8: Installation des dépendances et build

```bash
cd /var/www/interkom

# Installer les dépendances avec pnpm
pnpm install

# Builder l'application
pnpm run build

# Vérifier que le dossier dist existe
ls -la dist/
```

## Étape 9: Configuration de nginx

```bash
# Copier la configuration nginx
sudo cp nginx.conf /etc/nginx/sites-available/interkom

# Éditer la configuration pour remplacer le nom de domaine
sudo nano /etc/nginx/sites-available/interkom
```

**Remplacez** `votre-domaine.com` par votre vrai nom de domaine.

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/interkom /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut (optionnel)
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

## Étape 10: Tester l'application

Ouvrez votre navigateur et accédez à:
- `http://votre-domaine.com`

Vous devriez voir l'interface de connexion Interkom!

## Étape 11: Configuration SSL avec Let's Encrypt (HTTPS)

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL (remplacez par votre domaine)
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Suivez les instructions à l'écran
# Choisissez de rediriger HTTP vers HTTPS (option 2)

# Le certificat se renouvellera automatiquement
# Pour tester le renouvellement:
sudo certbot renew --dry-run
```

Ou utilisez la configuration SSL manuelle:

```bash
# Après avoir obtenu le certificat
sudo cp nginx-ssl.conf /etc/nginx/sites-available/interkom

# Éditer pour remplacer le domaine
sudo nano /etc/nginx/sites-available/interkom

# Tester et recharger
sudo nginx -t
sudo systemctl reload nginx
```

## Étape 12: Script de mise à jour automatique

Créez un script pour faciliter les mises à jour:

```bash
nano ~/update-interkom.sh
```

Contenu du script:

```bash
#!/bin/bash

echo "Mise à jour d'Interkom..."

cd /var/www/interkom

# Pull les dernières modifications (si Git)
git pull

# Installer les dépendances
pnpm install

# Builder
pnpm run build

# Recharger nginx
sudo systemctl reload nginx

echo "Mise à jour terminée!"
```

Rendez le script exécutable:

```bash
chmod +x ~/update-interkom.sh
```

Pour mettre à jour l'application:

```bash
~/update-interkom.sh
```

## Dépannage

### L'application ne s'affiche pas

```bash
# Vérifier les logs nginx
sudo tail -f /var/log/nginx/error.log

# Vérifier que les fichiers existent
ls -la /var/www/interkom/dist/

# Vérifier les permissions
sudo chown -R www-data:www-data /var/www/interkom/dist
```

### Erreur "502 Bad Gateway"

```bash
# Vérifier que nginx est actif
sudo systemctl status nginx

# Redémarrer nginx
sudo systemctl restart nginx
```

### Problème de variables d'environnement

```bash
# Vérifier le fichier .env
cat /var/www/interkom/.env

# Rebuilder l'application
cd /var/www/interkom
pnpm run build
```

### Problème de permissions

```bash
# Corriger les permissions
sudo chown -R $USER:$USER /var/www/interkom
sudo chown -R www-data:www-data /var/www/interkom/dist
```

## Commandes utiles

```bash
# Redémarrer nginx
sudo systemctl restart nginx

# Recharger la configuration nginx (sans interruption)
sudo systemctl reload nginx

# Voir les logs nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Tester la configuration nginx
sudo nginx -t

# Voir le statut nginx
sudo systemctl status nginx
```

## Structure des fichiers sur le serveur

```
/var/www/interkom/
├── dist/                  # Fichiers buildés (servis par nginx)
│   ├── index.html
│   ├── assets/
│   └── ...
├── src/                   # Code source
├── public/
├── package.json
├── .env                   # Variables d'environnement
├── nginx.conf            # Config nginx HTTP
└── nginx-ssl.conf        # Config nginx HTTPS
```

## Sécurité

- Toujours utiliser HTTPS en production (Let's Encrypt gratuit)
- Garder le système à jour: `sudo apt update && sudo apt upgrade`
- Ne jamais commiter le fichier `.env` dans Git
- Configurer un pare-feu (UFW déjà configuré ci-dessus)
- Sauvegarder régulièrement la base de données Supabase

## Support

Pour plus d'aide:
- Documentation nginx: https://nginx.org/en/docs/
- Documentation Supabase: https://supabase.com/docs
- Documentation pnpm: https://pnpm.io/

---

**Identifiants de test:**
- Admin: admin@interkom.local / admin123
- Client: client@interkom.local / client123
