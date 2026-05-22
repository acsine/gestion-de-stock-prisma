@echo off
setlocal enabledelayedexpansion
title Installateur ThaborSolution
chcp 65001 >nul 2>&1

echo ====================================================
echo    INSTALLATION DE THABORSOLUTION STOCK MANAGER
echo ====================================================
echo.

:: 1. Vérification de Python
echo Verification de l'environnement Python...

set PYTHON_EXE=

:: Essayer d'abord les commandes globales existantes directement
python -c "import sys" >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_EXE=python
    goto :python_found
)

py -c "import sys" >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_EXE=py
    goto :python_found
)

python3 -c "import sys" >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_EXE=python3
    goto :python_found
)

:: Si les commandes directes ont échoué ou ne sont pas configurées, chercher les exécutables physiques
where py >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('py -c "import sys; print(sys.executable)" 2^>nul') do (
        set "TEMP_PYTHON=%%i"
        if exist "!TEMP_PYTHON!" (
            "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
            if !errorlevel! equ 0 (
                set "PYTHON_EXE=!TEMP_PYTHON!"
                goto :python_found
            )
        )
    )
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)" 2^>nul') do (
        set "TEMP_PYTHON=%%i"
        if exist "!TEMP_PYTHON!" (
            "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
            if !errorlevel! equ 0 (
                set "PYTHON_EXE=!TEMP_PYTHON!"
                goto :python_found
            )
        )
    )
)

where python3 >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('python3 -c "import sys; print(sys.executable)" 2^>nul') do (
        set "TEMP_PYTHON=%%i"
        if exist "!TEMP_PYTHON!" (
            "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
            if !errorlevel! equ 0 (
                set "PYTHON_EXE=!TEMP_PYTHON!"
                goto :python_found
            )
        )
    )
)

:: Chercher dans les emplacements utilisateur communs
for /d %%d in ("C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python*") do (
    if exist "%%d\python.exe" (
        set "TEMP_PYTHON=%%d\python.exe"
        "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=!TEMP_PYTHON!"
            goto :python_found
        )
    )
)

:: Chercher dans les emplacements système communs
for /d %%d in ("C:\Program Files\Python*") do (
    if exist "%%d\python.exe" (
        set "TEMP_PYTHON=%%d\python.exe"
        "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=!TEMP_PYTHON!"
            goto :python_found
        )
    )
)

for /d %%d in ("C:\Program Files (x86)\Python*") do (
    if exist "%%d\python.exe" (
        set "TEMP_PYTHON=%%d\python.exe"
        "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=!TEMP_PYTHON!"
            goto :python_found
        )
    )
)

for /d %%d in ("C:\Python*") do (
    if exist "%%d\python.exe" (
        set "TEMP_PYTHON=%%d\python.exe"
        "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=!TEMP_PYTHON!"
            goto :python_found
        )
    )
)

if exist "C:\Users\%USERNAME%\AppData\Local\Python\bin\python.exe" (
    set "TEMP_PYTHON=C:\Users\%USERNAME%\AppData\Local\Python\bin\python.exe"
    "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=!TEMP_PYTHON!"
        goto :python_found
    )
)

for /d %%d in ("C:\Users\%USERNAME%\AppData\Local\Python\pythoncore-*") do (
    if exist "%%d\python.exe" (
        set "TEMP_PYTHON=%%d\python.exe"
        "!TEMP_PYTHON!" -c "import sys" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=!TEMP_PYTHON!"
            goto :python_found
        )
    )
)

echo [INFO] Python n'est pas detecte.
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

:python_found
echo [OK] Python trouve : %PYTHON_EXE%
echo.

:: 2. Lancement du script de configuration
echo Lancement de la configuration automatique...
echo.
set PYTHONUTF8=1
"%PYTHON_EXE%" setup.py

if %errorlevel% equ 0 goto :setup_success
echo.
echo [ERREUR] Le script de configuration a rencontre un probleme.
pause
exit /b

:setup_success
echo.
echo Operation terminee.
pause
