from .utils import run_command, log_info, log_error

def open_port(port, name):
    """Ouvre un port dans le pare-feu Windows."""
    log_info(f"Ouverture du port {port} ({name}) dans le pare-feu...")
    # Supprimer la règle si elle existe déjà pour éviter les doublons
    run_command(f'netsh advfirewall firewall delete rule name="{name}"')
    
    cmd = f'netsh advfirewall firewall add rule name="{name}" dir=in action=allow protocol=TCP localport={port}'
    success, output = run_command(cmd)
    if success:
        log_info(f"Port {port} ouvert avec succès.")
    else:
        log_error(f"Erreur lors de l'ouverture du port {port}: {output}")

def list_rules():
    """Liste les règles de pare-feu liées au serveur."""
    success, output = run_command('netsh advfirewall firewall show rule name=all')
    return output if success else ""
