@echo off
setlocal enabledelayedexpansion
title Installateur ThaborSolution
echo ====================================================
echo    INSTALLATION DE THABORSOLUTION STOCK MANAGER
echo ====================================================
echo.

:: 1. Vérification de Python
echo Verification de l'environnement Python...
set PYTHON_CMD=
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
) else (
    py --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=py
    )
)

:: 2. Si Python est manquant, essayer de l'installer via Winget
if "%PYTHON_CMD%"=="" (
    echo [INFO] Python n'est pas detecte dans le PATH.
    echo Tentative d'installation automatique via Winget...
    
    winget --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERREUR] Winget n'est pas disponible. 
        echo Veuillez installer Python manuellement sur https://www.python.org/
        pause
        exit /b
    )

    echo Installation de Python 3... Veuillez patienter.
    winget install Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    
    echo.
    echo [IMPORTANT] Python a ete installe. 
    echo Veuillez FERMER cette fenetre et RELANCER setup.bat pour continuer.
    pause
    exit /b
)

:: 3. Lancement du script de configuration
echo Utilisation de la commande : %PYTHON_CMD%
echo Lancement de la configuration automatique...
%PYTHON_CMD% setup.py

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Le script de configuration a rencontre un probleme.
    pause
)

echo.
echo Operation terminee.
pause
