#!/bin/bash

echo "======================================"
echo "  Mise à jour d'Interkom"
echo "======================================"
echo ""

cd /var/www/interkom

# Sauvegarder le fichier .env
if [ -f .env ]; then
    echo "✓ Sauvegarde du fichier .env..."
    cp .env .env.backup
fi

# Pull les dernières modifications (si Git)
if [ -d .git ]; then
    echo "✓ Récupération des dernières modifications..."
    git pull
else
    echo "⚠ Pas de repository Git détecté"
fi

# Installer/Mettre à jour les dépendances
echo "✓ Installation des dépendances avec pnpm..."
pnpm install

# Builder l'application
echo "✓ Build de l'application..."
pnpm run build

# Vérifier que le build a réussi
if [ ! -d "dist" ]; then
    echo "✗ Erreur: Le dossier dist n'a pas été créé"
    exit 1
fi

# Ajuster les permissions
echo "✓ Ajustement des permissions..."
sudo chown -R www-data:www-data dist/

# Recharger nginx
echo "✓ Rechargement de nginx..."
sudo systemctl reload nginx

echo ""
echo "======================================"
echo "  ✓ Mise à jour terminée avec succès!"
echo "======================================"
