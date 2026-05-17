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

where py >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :python_found
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :python_found
)

where python3 >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    goto :python_found
)

:python_found
if not "%PYTHON_CMD%"=="" goto :run_setup

echo [INFO] Python n'est pas detecte (ni 'py', ni 'python', ni 'python3').
echo Tentative d'installation automatique via Winget...
echo.

winget --version >nul 2>&1
if %errorlevel% equ 0 goto :winget_ok

echo [ERREUR] Python n'est pas installe sur cette machine.
echo Veuillez installer Python manuellement depuis https://www.python.org/
echo Assurez-vous de cocher "Add Python to PATH" lors de l'installation.
echo.
pause
exit /b

:winget_ok
echo Installation de Python... Veuillez patienter.
winget install Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% equ 0 goto :install_ok
echo.
echo [ERREUR] L'installation via winget a echoue. Veuillez installer Python manuellement depuis https://www.python.org/
pause
exit /b

:install_ok
echo.
echo [IMPORTANT] Python a ete installe. 
echo Veuillez FERMER cette fenetre et RELANCER setup.bat.
pause
exit /b

:run_setup
:: 3. Lancement du script de configuration
echo Utilisation de la commande : %PYTHON_CMD%
echo Lancement de la configuration automatique...
echo.
%PYTHON_CMD% setup.py

if %errorlevel% equ 0 goto :setup_success
echo.
echo [ERREUR] Le script de configuration a rencontre un probleme.
pause
exit /b

:setup_success
echo.
echo Operation terminee.
pause
