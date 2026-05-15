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
for %%P in (py python python3) do (
    where %%P >nul 2>&1
    if !errorlevel! equ 0 (
        set PYTHON_CMD=%%P
        goto :python_found
    )
)

:python_found
if "%PYTHON_CMD%"=="" (
    echo [INFO] Python n'est pas detecte (ni 'py', ni 'python', ni 'python3').
    echo Tentative d'installation automatique via Winget...
    
    winget --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERREUR] Python n'est pas installe sur cette machine.
        echo Veuillez installer Python manuellement depuis https://www.python.org/
        echo (Assurez-vous de cocher "Add Python to PATH" lors de l'installation)
        pause
        exit /b
    )

    echo Installation de Python... Veuillez patienter.
    winget install Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    
    echo.
    echo [IMPORTANT] Python a ete installe. 
    echo Veuillez FERMER cette fenetre et RELANCER setup.bat.
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
