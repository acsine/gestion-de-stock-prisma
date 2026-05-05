@echo off
title Installation Sachand Stock Manager
echo ====================================================
echo    INSTALLATION DU SYSTEME DE GESTION DE STOCK
echo ====================================================
echo.
echo Rappel : Veuillez fermer le serveur (npm run dev) avant de continuer.
echo.
pause
echo.
npx tsx src/scripts/install.ts
echo.
echo Appuyez sur une touche pour fermer...
pause > nul
