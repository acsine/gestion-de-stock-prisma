import os
from .utils import log_info, log_error, log_success, run_command

def check_node():
    """Vérifie si Node.js est installé."""
    success, output = run_command("node -v")
    if success:
        log_info(f"Node.js détecté : {output.strip()}")
        return True
    log_error("Node.js n'est pas installé.")
    return False

def setup_project(project_path):
    """Installe les dépendances et build le projet Next.js."""
    log_info("Installation des dépendances npm...")
    success, output = run_command("npm install", cwd=project_path)
    if not success:
        log_error(f"Erreur npm install : {output}")
        return False

    log_info("Build du projet Next.js...")
    success, output = run_command("npm run build", cwd=project_path)
    if not success:
        log_error(f"Erreur npm build : {output}")
        return False
    
    log_success("Projet Next.js prêt.")
    return True

def start_with_pm2(project_path, app_name, port):
    """Lance l'application avec PM2."""
    # Vérifier si PM2 est installé
    success, _ = run_command("pm2 -v")
    if not success:
        log_info("Installation de PM2...")
        run_command("npm install -g pm2")

    log_info(f"Lancement de {app_name} sur le port {port} via PM2...")
    
    # Vérifier si l'app existe déjà pour faire un restart au lieu d'un start
    success_list, list_output = run_command(f"pm2 show {app_name}")
    if success_list and app_name in list_output:
        cmd = f"pm2 restart {app_name}"
    else:
        cmd = f'pm2 start npm --name "{app_name}" -- start -- -p {port}'
    
    success, output = run_command(cmd, cwd=project_path)
    
    if success:
        run_command("pm2 save")
        
        # Persistance PM2 au démarrage Windows
        log_info("Configuration de la persistance PM2...")
        run_command("npm install -g pm2-windows-startup")
        run_command("pm2-startup install")
        
        # Raccourci bureau
        from .utils import create_desktop_shortcut
        create_desktop_shortcut(app_name, f"http://{app_name}.local")
        
        log_success(f"Application {app_name} lancée et raccourci créé !")
        return True
    else:
        log_error(f"Erreur PM2 : {output}")
        return False

def stop_app(app_name):
    """Arrête une application PM2."""
    run_command(f"pm2 delete {app_name}")
