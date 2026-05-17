import subprocess
import os
import sys
import socket
import time
import shutil
import secrets
import re
from pathlib import Path

# Configuration
APP_NAME = "ThaborSolution Stock Manager"
DB_NAME = "gestionstock"
DB_USER = "postgres"
DB_PASS = "FOMO"  # Mot de passe par défaut
PORT = 3000

def run_command(command, shell=True, check=True, cwd=None, show_output=False):
    """Exécute une commande et retourne le résultat."""
    try:
        if show_output:
            result = subprocess.run(
                command,
                shell=shell,
                check=check,
                cwd=cwd
            )
            return ""
        else:
            result = subprocess.run(
                command,
                shell=shell,
                check=check,
                cwd=cwd,
                capture_output=True,
                encoding="utf-8",
                errors="replace"
            )
            return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"\n[ERREUR] La commande a échoué : {command}")
        if not show_output:
            print(f"Sortie : {e.stdout}")
            print(f"Erreur : {e.stderr}")
        if check:
            input("\nAppuyez sur Entrée pour quitter...")
            sys.exit(1)
        return None

def check_cmd(cmd):
    """Vérifie si une commande existe dans le système."""
    return shutil.which(cmd) is not None

def add_to_system_path(directory_path):
    """Ajoute de manière temporaire et permanente un répertoire au PATH système."""
    if not os.path.exists(directory_path):
        return
    # Session en cours
    if directory_path not in os.environ["PATH"]:
        os.environ["PATH"] += os.pathsep + directory_path
    
    # Permanent via PowerShell pour éviter les conflits et doublons
    try:
        check_cmd_str = '[Environment]::GetEnvironmentVariable("PATH", "User")'
        current_user_path = subprocess.run(f'powershell -Command "{check_cmd_str}"', capture_output=True, encoding="utf-8", errors="replace", shell=True).stdout.strip()
        if directory_path not in current_user_path:
            # Escape directory path for PowerShell single quotes
            escaped_dir = directory_path.replace("'", "''")
            add_cmd = f"$old = [Environment]::GetEnvironmentVariable('PATH', 'User'); [Environment]::SetEnvironmentVariable('PATH', $old + ';{escaped_dir}', 'User')"
            subprocess.run(f'powershell -Command "{add_cmd}"', shell=True)
            print(f"➕ Chemin ajoute de maniere permanente au PATH : {directory_path}")
    except Exception as e:
        print(f"⚠️ Impossible d'ajouter le chemin au PATH systeme : {e}")

def check_and_configure_node():
    """Détecte Node.js, le configure automatiquement s'il existe déjà pour éviter les doublons, ou l'installe."""
    if check_cmd("node"):
        print("[OK] Node.js est deja installe et configure.")
        return True

    # Chemins d'installation par défaut sous Windows
    common_paths = [
        "C:\\Program Files\\nodejs",
        "C:\\Program Files (x86)\\nodejs",
        os.path.join(os.environ.get("APPDATA", ""), "npm")
    ]
    for p in common_paths:
        node_exe = os.path.join(p, "node.exe")
        if os.path.exists(node_exe):
            print(f"🔍 Node.js trouve dans : {p}. Configuration automatique du PATH...")
            add_to_system_path(p)
            if check_cmd("node"):
                print("[OK] Node.js configure avec succes.")
                return True

    # Si absent, installer via winget
    print("📥 Node.js est absent. Installation automatique via Winget...")
    try:
        run_command("winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements")
        # Ajout immédiat au PATH
        default_path = "C:\\Program Files\\nodejs"
        if os.path.exists(default_path):
            add_to_system_path(default_path)
        print("✅ Node.js installe avec succes.")
        return True
    except Exception as e:
        print(f"❌ Impossible d'installer Node.js automatiquement : {e}")
        return False

def check_and_configure_postgres():
    """Détecte PostgreSQL, le configure automatiquement s'il existe déjà pour éviter les doublons, ou l'installe."""
    if check_cmd("psql"):
        print("[OK] PostgreSQL est deja installe et configure.")
        return True

    pg_root = Path("C:/Program Files/PostgreSQL")
    if pg_root.exists():
        bins = list(pg_root.glob("**/bin/psql.exe"))
        if bins:
            bin_dir = str(bins[0].parent)
            print(f"🔍 PostgreSQL trouve dans : {bin_dir}. Configuration automatique du PATH...")
            add_to_system_path(bin_dir)
            if check_cmd("psql"):
                print("[OK] PostgreSQL configure avec succes.")
                return True

    # Si absent, installer via winget
    print("📥 PostgreSQL est absent. Installation automatique via Winget...")
    try:
        run_command("winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements")
        time.sleep(5)
        if pg_root.exists():
            bins = list(pg_root.glob("**/bin/psql.exe"))
            if bins:
                bin_dir = str(bins[0].parent)
                add_to_system_path(bin_dir)
        print("✅ PostgreSQL installe avec succes.")
        return True
    except Exception as e:
        print(f"❌ Impossible d'installer PostgreSQL automatiquement : {e}")
        return False

def get_local_ip():
    """Récupère l'adresse IP locale de la machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

def update_env_file():
    """Configure le fichier .env avec des valeurs sécurisées et correctes."""
    if not os.path.exists(".env"):
        if os.path.exists(".env.example"):
            shutil.copy(".env.example", ".env")
        else:
            with open(".env", "w") as f:
                f.write("DATABASE_URL=\"\"\nNEXTAUTH_SECRET=\"\"\nNEXTAUTH_URL=\"http://localhost:3000\"\n")

    with open(".env", "r", encoding="utf-8") as f:
        content = f.read()

    # Configuration de la DB
    db_url = f"postgresql://{DB_USER}:{DB_PASS}@localhost:5432/{DB_NAME}"
    if "DATABASE_URL" in content:
        content = re.sub(r'DATABASE_URL=.*', f'DATABASE_URL="{db_url}"', content)
    else:
        content += f'\nDATABASE_URL="{db_url}"'

    # Génération d'un secret si nécessaire
    if 'NEXTAUTH_SECRET=""' in content or "NEXTAUTH_SECRET" not in content or "remplacer-par" in content:
        secret = secrets.token_urlsafe(32)
        if "NEXTAUTH_SECRET" in content:
            content = re.sub(r'NEXTAUTH_SECRET=.*', f'NEXTAUTH_SECRET="{secret}"', content)
        else:
            content += f'\nNEXTAUTH_SECRET="{secret}"'

    with open(".env", "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ Fichier .env configuré avec succès.")

def create_shortcut():
    """Crée un raccourci sur le bureau Windows."""
    try:
        from win32com.client import Dispatch
        import winshell
        
        desktop = winshell.desktop()
        path = os.path.join(desktop, f"{APP_NAME}.lnk")
        target = os.path.join(os.getcwd(), "start_app.bat")
        wDir = os.getcwd()
        icon = os.path.join(os.getcwd(), "public", "favicon.ico")

        shell = Dispatch('WScript.Shell')
        shortcut = shell.CreateShortCut(path)
        shortcut.Targetpath = target
        shortcut.WorkingDirectory = wDir
        if os.path.exists(icon):
            shortcut.IconLocation = icon
        shortcut.save()
        print(f"✅ Raccourci créé sur le Bureau : {APP_NAME}")
    except Exception as e:
        print(f"⚠️ Impossible de créer le raccourci automatiquement : {e}")
        print("Note: Vous pouvez utiliser 'start_app.bat' manuellement.")

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("====================================================")
    print(f"   INSTALLATEUR COMPLET : {APP_NAME.upper()}")
    print("====================================================")
    print("\nCe script va installer TOUTES les dépendances et configurer l'application.\n")

    # 1. Vérification Node.js
    if not check_and_configure_node():
        print("❌ Impossible de configurer ou d'installer Node.js automatiquement.")
        input("Appuyez sur Entrée pour quitter...")
        sys.exit(1)
    
    # 2. Vérification PostgreSQL
    if not check_and_configure_postgres():
        print("❌ Impossible de configurer ou d'installer PostgreSQL automatiquement.")
        input("Appuyez sur Entrée pour quitter...")
        sys.exit(1)

    # 3. Installation des dépendances NPM
    print("\n📦 Installation des bibliothèques logicielles (npm install)...")
    run_command("npm install", show_output=True)

    # 4. Configuration .env
    print("📝 Configuration des paramètres système (.env)...")
    update_env_file()
    
    # 5. Base de données
    print("🗄️ Création de la base de données...")
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASS
    
    # Tentative de création de la DB
    subprocess.run(f'psql -U {DB_USER} -c "CREATE DATABASE {DB_NAME};"', shell=True, env=env, capture_output=True)

    print("🚀 Initialisation du moteur de données (Prisma)...")
    run_command("npx prisma generate", show_output=True)
    run_command("npx prisma db push --accept-data-loss", show_output=True)
    
    print("🌱 Chargement des données d'usine et compte admin...")
    run_command("npx tsx prisma/seed.ts", show_output=True)

    # 6. Script de démarrage
    print("📝 Création du lanceur rapide...")
    with open("start_app.bat", "w", encoding="utf-8") as f:
        f.write("@echo off\n")
        f.write("title " + APP_NAME + "\n")
        f.write("cd /d \"%~dp0\"\n")
        f.write("echo ====================================================\n")
        f.write("echo    DEMARRAGE DE " + APP_NAME.upper() + "\n")
        f.write("echo ====================================================\n")
        f.write("echo.\n")
        f.write("where node >nul 2>&1\n")
        f.write("if %errorlevel% equ 0 goto :node_ok\n")
        f.write("echo [ERREUR] Node.js n'est pas installe ou non detecte sur cette machine.\n")
        f.write("echo.\n")
        f.write("echo Pour faire fonctionner l'application en local, vous devez installer Node.js :\n")
        f.write("echo 1. Telechargez Node.js sur : https://nodejs.org/\n")
        f.write("echo 2. Installez-le en vous assurant que l'option \"Ajouter au PATH\" est activee.\n")
        f.write("echo 3. Fermez tous vos terminaux, puis relancez start_app.bat.\n")
        f.write("echo.\n")
        f.write("pause\n")
        f.write("exit /b\n")
        f.write("\n")
        f.write(":node_ok\n")
        f.write("\n")
        f.write("if exist \"node_modules\\\" goto :modules_ok\n")
        f.write("echo [Systeme] Dossier node_modules absent.\n")
        f.write("echo [Systeme] Installation des dependances en cours (veuillez patienter)...\n")
        f.write("call npm install\n")
        f.write("if %errorlevel% equ 0 goto :modules_ok\n")
        f.write("echo.\n")
        f.write("echo [ERREUR] L'installation des dependances a echoue.\n")
        f.write("pause\n")
        f.write("exit /b\n")
        f.write("\n")
        f.write(":modules_ok\n")
        f.write("\n")
        f.write("if exist \"prisma\\dev.db\" goto :db_ok\n")
        f.write("echo [Systeme] Base de donnees absente. Initialisation...\n")
        f.write("call npx prisma db push\n")
        f.write("if %errorlevel% equ 0 goto :db_ok\n")
        f.write("echo.\n")
        f.write("echo [ERREUR] Impossible de creer la base de donnees.\n")
        f.write("pause\n")
        f.write("exit /b\n")
        f.write("\n")
        f.write(":db_ok\n")
        f.write("\n")
        f.write("echo [Systeme] Lancement du serveur local...\n")
        f.write("echo [Systeme] Le site va s'ouvrir automatiquement dans votre navigateur.\n")
        f.write("echo.\n")
        f.write("start http://localhost:3000\n")
        f.write("call npm run dev\n")
        f.write("if %errorlevel% neq 0 (\n")
        f.write("    echo.\n")
        f.write("    echo [ERREUR] Le serveur s'est arrete avec une erreur.\n")
        f.write("    pause\n")
        f.write(")\n")

    # 7. Raccourci Bureau
    try:
        print("🛠️ Installation des outils de raccourci...")
        run_command("pip install winshell pywin32", check=False)
        create_shortcut()
    except:
        pass

    print("\n====================================================")
    print("🎉 INSTALLATION ET CONFIGURATION RÉUSSIES !")
    print("====================================================")
    print(f"\nVous pouvez maintenant utiliser l'application :")
    print(f"1. Via le RACCOURCI sur votre Bureau")
    print(f"2. Via le fichier 'start_app.bat'")
    print(f"\nAccès depuis un mobile/tablette : http://{get_local_ip()}:{PORT}")
    print("\nIdentifiants par défaut :")
    print("Email : admin@stockapigestion.com")
    print("Password : Admin@1234")
    print("====================================================")
    input("\nAppuyez sur Entrée pour terminer...")

if __name__ == "__main__":
    main()
