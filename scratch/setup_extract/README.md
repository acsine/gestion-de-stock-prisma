# 📦 ThaborSolution Stock Manager

Logiciel de gestion de stock multi-utilisateurs développé avec **Next.js 15**, **Prisma**, **PostgreSQL**, **TanStack Query**, **Zustand** et **Zod**.

---

## ⚡ Installation Rapide (Recommandé)

Si vous avez **Python** installé, vous pouvez utiliser l'installateur automatique qui configure tout pour vous (PostgreSQL, Node.js, Base de données, Raccourci Bureau) :

1. Ouvrez le dossier du projet.
2. Double-cliquez sur **`setup.bat`**.
3. Suivez les instructions à l'écran.
4. Une fois terminé, utilisez le raccourci **ThaborSolution Stock Manager** sur votre bureau pour lancer l'application.

---

## 🚀 Installation Manuelle (Développeurs)

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de la base de données
Copier `.env.example` en `.env` :
```bash
copy .env.example .env
```
Éditer `.env` avec vos accès PostgreSQL.

### 3. Initialisation
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Démarrage
```bash
npm run dev
```
Ouvrir http://localhost:3000

**Compte administrateur :** `admin@stockapigestion.com` / `Admin@1234`

---


## 🏗️ Déploiement en production (réseau LAN)

### Sur la machine serveur Windows
```bash
# Build de production
npm run build

# Démarrage avec PM2
npm install -g pm2
pm2 start npm --name "sachand-stock" -- start
pm2 save
pm2 startup
```

Les autres postes du réseau accèdent via `http://IP_DU_SERVEUR:3000`

---

## 📁 Structure du projet

```
stockapigestion/
├── prisma/
│   ├── schema.prisma          # Modèle de données complet (18 entités)
│   └── seed.ts                # Données initiales
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Page de connexion
│   │   ├── (dashboard)/       # Pages protégées
│   │   │   ├── dashboard/     # Tableau de bord
│   │   │   ├── produits/      # Gestion produits + import Excel
│   │   │   ├── categories/    # Catégories
│   │   │   ├── stock/         # Mouvements de stock
│   │   │   ├── alertes/       # Alertes de stock
│   │   │   ├── factures/      # Factures (PDF/Word/Excel)
│   │   │   ├── commandes/     # Bons de commande
│   │   │   ├── clients/       # Clients
│   │   │   ├── fournisseurs/  # Fournisseurs
│   │   │   ├── employes/      # RH
│   │   │   ├── salaires/      # Paie (PDF)
│   │   │   ├── finances/      # Transactions
│   │   │   ├── rapports/      # Rapports (PDF/Excel/Word)
│   │   │   ├── utilisateurs/  # Gestion utilisateurs
│   │   │   └── parametres/    # Paramètres
│   │   └── api/               # API Routes
│   ├── components/            # Composants React
│   ├── hooks/                 # TanStack Query hooks
│   ├── stores/                # Zustand stores
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── prisma.ts          # Prisma singleton
│   │   ├── reports.ts         # Génération PDF/Excel/Word
│   │   ├── utils.ts           # Utilitaires
│   │   └── validations/       # Schémas Zod
│   ├── middleware.ts           # Protection routes
│   └── types/                 # Types TypeScript
```

---

## 🛡️ Rôles et permissions

| Rôle               | Accès |
|--------------------|-------|
| ADMIN              | Tout  |
| GESTIONNAIRE_STOCK | Produits, stock, alertes |
| COMPTABLE          | Finances, factures, salaires |
| VENDEUR            | Factures, consultation stock |
| RH                 | Employés, salaires |
| AUDITEUR           | Lecture seule, rapports |

---

## 📊 Modules fonctionnels

| Module | Fonctionnalités |
|--------|-----------------|
| **Produits** | CRUD, import Excel (.xlsx), export Excel/Word |
| **Stock** | Entrées/Sorties, mouvements, alertes automatiques |
| **Factures** | Création, paiements, export PDF/Word |
| **Bons commande** | Création fournisseur, suivi réception |
| **Finances** | Transactions, trésorerie, rapports |
| **Employés** | Fiches RH, contrats, congés |
| **Salaires** | Génération automatique, fiches PDF, export Excel |
| **Rapports** | Stock, factures, salaires — PDF/Excel/Word |
| **Alertes** | Stock bas, critique, rupture, surstock |

---

## 🔧 Commandes utiles

```bash
npm run dev              # Développement
npm run build            # Build production
npm run start            # Démarrage production
npm run db:studio        # Interface BDD Prisma Studio
npm run db:migrate       # Nouvelle migration
npm run db:seed          # Réinitialiser les données démo
```

---

## 📋 Import Excel — Format attendu

Le fichier Excel d'import produits doit contenir les colonnes suivantes :

| SKU | Nom | Catégorie | Prix Achat | Prix Vente | TVA | Stock Min | Stock Max | Unité | Stock Initial |
|-----|-----|-----------|-----------|-----------|-----|-----------|-----------|-------|---------------|
| PROD-001 | Mon Produit | Électronique | 5000 | 7500 | 19.25 | 5 | 100 | Pièce | 20 |

---

**Version 1.0 — ThaborSolution Stock Manager**



Guide d'utilisation du Server Manager
Pré-requis
Python 3.x installé.
Node.js et npm installés.
Terminal Administrateur (PowerShell ou CMD).
Étapes de test
Lancement : Exécutez python main.py.
Ajout d'une App :
Entrez un nom (ex: stock).
Entrez le domaine (ex: stock.local).
Spécifiez le port (ex: 3000).
Donnez le chemin complet de votre dossier stockapigestion.
Vérification :
Ouvrez votre navigateur et allez sur http://stock.local.
L'application devrait être servie via Nginx.
Maintenance
Pour voir vos applications actives : pm2 status.
Pour voir les logs Nginx : C:\nginx\logs.
> [!TIP]
> Si vous voulez que d'autres appareils (téléphones, tablettes) accèdent à l'application via `stock.local`, vous devrez configurer votre routeur pour pointer le DNS vers l'IP de votre serveur, ou utiliser un outil comme **Technitium DNS** sur cette machine. En attendant, l'accès via l'adresse IP locale (`http://192.168.x.x:3000`) fonctionnera sur tout le réseau grâce à l'ouverture automatique du pare-feu.@2
Souhaites-tu que je t'aide à lancer un premier test sur ton projet actuel ?



SuperAdministrateur ThaborSolution : superadmin@thaborsolution.com / SuperAdmin@2026
Marchand (Test) : marchand@thaborsolution.com / Merchant@123 (Slug: thabor-merchant)




superadmin@thaborsolution.com / SuperAdmin@2026
Résultat : Accès complet à la gestion système + vue globale du stock et des ventes de tous les marchands.
Marchand (Test) : marchand@thaborsolution.com / Merchant@123 (Slug: thabor-merchant)