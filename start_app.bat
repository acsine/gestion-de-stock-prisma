@echo off
title Sachand Stock Manager - Serveur Local
cd /d "%~dp0"

echo ====================================================
echo    DEMARRAGE DE SACHAND STOCK MANAGER
echo ====================================================
echo.

:: 1. Vérification de node_modules
if not exist "node_modules\" (
    echo [Systeme] Dossier node_modules absent.
    echo [Systeme] Installation des dependances en cours (veuillez patienter)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERREUR] L'installation des dependances a echoue.
        echo Assurez-vous d'etre connecte a Internet et que Node.js est installe.
        pause
        exit /b
    )
)

:: 2. Initialisation de la base de donnees si absente
if not exist "prisma\dev.db" (
    echo [Systeme] Base de donnees absente. Initialisation...
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo.
        echo [ERREUR] Impossible de creer la base de donnees.
        pause
        exit /b
    )
)

echo [Systeme] Lancement du serveur local...
echo [Systeme] Le site va s'ouvrir automatiquement dans votre navigateur.
echo.

:: Ouvrir le navigateur après un court délai
start http://localhost:3000

:: Lancer le serveur de développement directement
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Le serveur s'est arrete avec une erreur.
    echo Assurez-vous que le port 3000 n'est pas utilise par une autre application.
    pause
)
