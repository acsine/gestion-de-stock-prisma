@echo off
title Sachand Stock Manager - Serveur Local
cd /d "%~dp0"

echo ====================================================
echo    DEMARRAGE DE SACHAND STOCK MANAGER
echo ====================================================
echo.

:: 0. Vérification de Node.js
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ok
echo [ERREUR] Node.js n'est pas installe ou non detecte sur cette machine.
echo.
echo Pour faire fonctionner l'application en local, vous devez installer Node.js :
echo 1. Telechargez Node.js sur : https://nodejs.org/
echo 2. Installez-le en vous assurant que l'option "Ajouter au PATH" est activee.
echo 3. Fermez tous vos terminaux, puis relancez start_app.bat.
echo.
pause
exit /b

:node_ok

:: 1. Vérification de node_modules
if exist "node_modules\" goto :modules_ok
echo [Systeme] Dossier node_modules absent.
echo [Systeme] Installation des dependances en cours (veuillez patienter)...
call npm install
if %errorlevel% equ 0 goto :modules_ok
echo.
echo [ERREUR] L'installation des dependances a echoue.
echo Assurez-vous d'etre connecte a Internet et que Node.js est installe.
pause
exit /b

:modules_ok

:: 2. Initialisation de la base de donnees si absente
if exist "prisma\dev.db" goto :db_ok
echo [Systeme] Base de donnees absente. Initialisation...
call npx prisma db push
if %errorlevel% equ 0 goto :db_ok
echo.
echo [ERREUR] Impossible de creer la base de donnees.
pause
exit /b

:db_ok

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
