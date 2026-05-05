import os
import shutil
import urllib.request
import zipfile
from .utils import log_info, log_error, log_success, run_command

NGINX_URL = "https://nginx.org/download/nginx-1.24.0.zip"
NGINX_DIR = r"C:\nginx"

def install_nginx():
    """Télécharge et installe Nginx pour Windows."""
    if os.path.exists(NGINX_DIR):
        log_info("Nginx est déjà installé dans C:\\nginx.")
        return True

    try:
        log_info("Téléchargement de Nginx...")
        zip_path = "nginx.zip"
        urllib.request.urlretrieve(NGINX_URL, zip_path)

        log_info("Extraction de Nginx...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall("C:\\")
        
        # Renommer le dossier extrait (ex: nginx-1.24.0 -> nginx)
        extracted_folder = [d for d in os.listdir("C:\\") if d.startswith("nginx-")][0]
        os.rename(os.path.join("C:\\", extracted_folder), NGINX_DIR)
        
        os.remove(zip_path)
        log_success("Nginx installé avec succès.")
        return True
    except Exception as e:
        log_error(f"Erreur lors de l'installation de Nginx : {e}")
        return False

def generate_vhost(domain, port):
    """Génère un fichier de configuration pour une application."""
    vhost_content = f"""
server {{
    listen 80;
    server_name {domain};

    location / {{
        proxy_pass http://localhost:{port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }}
}}
"""
    conf_path = os.path.join(NGINX_DIR, "conf", "vhosts", f"{domain}.conf")
    os.makedirs(os.path.dirname(conf_path), exist_ok=True)
    
    with open(conf_path, "w") as f:
        f.write(vhost_content)
    
    # S'assurer que le fichier principal inclut les vhosts
    include_line = "    include vhosts/*.conf;"
    main_conf = os.path.join(NGINX_DIR, "conf", "nginx.conf")
    
    with open(main_conf, "r") as f:
        content = f.read()
    
    if include_line not in content:
        # Insérer avant la dernière accolade fermante du bloc http
        last_brace = content.rfind("}")
        new_content = content[:last_brace] + include_line + "\n" + content[last_brace:]
        with open(main_conf, "w") as f:
            f.write(new_content)

def reload_nginx():
    """Redémarre ou recharge Nginx."""
    log_info("Redémarrage de Nginx...")
    # On ignore le résultat de taskkill car il échoue si nginx n'est pas déjà lancé
    import subprocess as sp
    sp.run("taskkill /f /im nginx.exe", shell=True, capture_output=True)
    
    try:
        # Lancer nginx sans attendre de retour (car c'est un processus persistant)
        sp.Popen(["nginx.exe"], cwd=NGINX_DIR, shell=True)
        
        # Ajouter au démarrage Windows
        from .utils import add_to_startup
        add_to_startup("Nginx_Server", os.path.join(NGINX_DIR, "nginx.exe"), NGINX_DIR)
        
        log_success("Nginx démarré.")
        return True
    except Exception as e:
        log_error(f"Erreur lors du démarrage de Nginx : {e}")
        return False
