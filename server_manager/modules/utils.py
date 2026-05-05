import subprocess
import sys
import os
import shutil
import ctypes

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def log_success(message):
    print(f"{Colors.OKGREEN}[SUCCÈS] {message}{Colors.ENDC}")

def log_info(message):
    print(f"{Colors.OKBLUE}[INFO] {message}{Colors.ENDC}")

def log_warning(message):
    print(f"{Colors.WARNING}[ATTENTION] {message}{Colors.ENDC}")

def log_error(message):
    print(f"{Colors.FAIL}[ERREUR] {message}{Colors.ENDC}")

def run_command(command, cwd=None, shell=True):
    """Exécute une commande système et retourne le résultat."""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr
    except Exception as e:
        return False, str(e)

def is_admin():
    """Vérifie si le script est exécuté en tant qu'administrateur."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        return False

def ensure_admin():
    """Relance le script en mode admin si nécessaire."""
    if not is_admin():
        log_warning("Ce script nécessite des privilèges Administrateur.")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        sys.exit()

def create_desktop_shortcut(name, url):
    """Crée un raccourci Internet sur le bureau Windows."""
    try:
        desktop = os.path.join(os.environ['USERPROFILE'], 'Desktop')
        shortcut_path = os.path.join(desktop, f"{name}.url")
        with open(shortcut_path, "w") as f:
            f.write("[InternetShortcut]\n")
            f.write(f"URL={url}\n")
        log_success(f"Raccourci créé sur le bureau : {name}")
    except Exception as e:
        log_error(f"Erreur lors de la création du raccourci : {e}")

def add_to_startup(name, exe_path, work_dir):
    """Ajoute un raccourci au dossier de démarrage de Windows."""
    try:
        startup_folder = os.path.join(os.environ['APPDATA'], r'Microsoft\Windows\Start Menu\Programs\Startup')
        shortcut_path = os.path.join(startup_folder, f"{name}.bat")
        with open(shortcut_path, "w") as f:
            f.write(f'@echo off\ncd /d "{work_dir}"\nstart "" "{exe_path}"\n')
        log_info(f"Ajouté au démarrage automatique : {name}")
    except Exception as e:
        log_error(f"Erreur lors de l'ajout au démarrage : {e}")
