import os
from .utils import log_info, log_error, log_success

HOSTS_PATH = r"C:\Windows\System32\drivers\etc\hosts"

def add_dns_entry(domain, ip):
    """Ajoute une entrée dans le fichier hosts."""
    try:
        entry = f"{ip} {domain}\n"
        
        # Vérifier si l'entrée existe déjà
        with open(HOSTS_PATH, 'r') as f:
            content = f.read()
            if domain in content:
                log_info(f"L'entrée DNS pour {domain} existe déjà.")
                return True

        # Ajouter l'entrée
        with open(HOSTS_PATH, 'a') as f:
            f.write(entry)
        
        log_success(f"Entrée DNS ajoutée : {domain} -> {ip}")
        return True
    except Exception as e:
        log_error(f"Erreur lors de la modification du fichier hosts : {e}")
        return False

def remove_dns_entry(domain):
    """Supprime une entrée du fichier hosts."""
    try:
        with open(HOSTS_PATH, 'r') as f:
            lines = f.readlines()
        
        with open(HOSTS_PATH, 'w') as f:
            for line in lines:
                if domain not in line:
                    f.write(line)
        
        log_success(f"Entrée DNS supprimée : {domain}")
        return True
    except Exception as e:
        log_error(f"Erreur lors de la suppression DNS : {e}")
        return False
