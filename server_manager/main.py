import os
import json
import sys
from modules.utils import Colors, log_info, log_error, log_success, ensure_admin
from modules.network import get_local_ip, is_port_in_use
from modules.firewall import open_port
from modules.dns import add_dns_entry, remove_dns_entry
from modules.nginx import install_nginx, generate_vhost, reload_nginx
from modules.nextjs import check_node, setup_project, start_with_pm2, stop_app
from modules.prisma import setup_prisma

CONFIG_FILE = "apps.json"

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return []

def save_config(apps):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(apps, f, indent=4)

def show_menu():
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== SERVEUR LOCAL MANAGER (WINDOWS) ==={Colors.ENDC}")
    print("1. Ajouter une nouvelle application Next.js")
    print("2. Lister les applications")
    print("3. Supprimer une application")
    print("4. Redémarrer les services (Nginx/PM2)")
    print("5. Quitter")
    return input(f"\n{Colors.OKCYAN}Votre choix : {Colors.ENDC}")

def add_app():
    ensure_admin()
    name = input("Nom de l'application (ex: stock) : ")
    domain = input("Nom de domaine local (ex: stock.local) : ")
    port = int(input("Port de l'application (ex: 3000) : "))
    path = input("Chemin absolu du projet Next.js : ")

    if not os.path.exists(path):
        log_error("Le chemin spécifié n'existe pas.")
        return

    if is_port_in_use(port):
        log_error(f"Le port {port} est déjà utilisé.")
        return

    ip = get_local_ip()
    
    log_info(f"Début de la configuration pour {domain}...")
    
    # 1. DNS
    if add_dns_entry(domain, ip):
        # 2. Firewall
        open_port(port, f"App_{name}")
        open_port(80, "Nginx_HTTP")
        
        # 3. Nginx
        install_nginx()
        generate_vhost(domain, port)
        reload_nginx()
        
        # 4. Next.js & Prisma
        if check_node():
            setup_prisma(path)
            if setup_project(path):
                if start_with_pm2(path, name, port):
                    apps = load_config()
                    apps.append({"name": name, "domain": domain, "port": port, "path": path})
                    save_config(apps)
                    log_success(f"\nApplication déployée ! Accessible sur http://{domain}")

def list_apps():
    apps = load_config()
    if not apps:
        print("Aucune application configurée.")
        return
    
    print(f"\n{Colors.BOLD}Applications installées :{Colors.ENDC}")
    for app in apps:
        print(f"- {app['name']} : http://{app['domain']} (Port: {app['port']})")

def delete_app():
    ensure_admin()
    apps = load_config()
    if not apps:
        print("Aucune application à supprimer.")
        return
    
    for i, app in enumerate(apps):
        print(f"{i+1}. {app['name']} ({app['domain']})")
    
    choice = int(input("Numéro de l'application à supprimer : ")) - 1
    if 0 <= choice < len(apps):
        app = apps[choice]
        stop_app(app['name'])
        remove_dns_entry(app['domain'])
        # Optionnel: supprimer le vhost nginx
        del apps[choice]
        save_config(apps)
        log_success("Application supprimée.")

def main():
    # S'assurer que le dossier de travail est correct pour les imports relatifs si besoin
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    while True:
        choice = show_menu()
        if choice == '1':
            add_app()
        elif choice == '2':
            list_apps()
        elif choice == '3':
            delete_app()
        elif choice == '4':
            reload_nginx()
            run_command("pm2 restart all")
        elif choice == '5':
            sys.exit()
        else:
            print("Choix invalide.")

if __name__ == "__main__":
    main()
