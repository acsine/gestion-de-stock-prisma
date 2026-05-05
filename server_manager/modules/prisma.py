import os
from .utils import log_info, log_error, log_success, log_warning, run_command

def setup_prisma(project_path):
    """Configure Prisma : generate et migrate."""
    if not os.path.exists(os.path.join(project_path, ".env")):
        log_warning("Fichier .env manquant. Prisma risque de ne pas fonctionner.")

    log_info("Exécution de prisma generate...")
    success, output = run_command("npx prisma generate", cwd=project_path)
    if not success:
        log_error(f"Erreur Prisma Generate : {output}")
        return False

    log_info("Exécution de prisma migrate deploy...")
    success, output = run_command("npx prisma migrate deploy", cwd=project_path)
    
    if not success and "P3005" in output:
        log_warning("Schéma non vide détecté. Tentative avec prisma db push...")
        success, output = run_command("npx prisma db push --accept-data-loss", cwd=project_path)

    if not success:
        log_error(f"Erreur Prisma : {output}")
        return False

    log_success("Prisma configuré avec succès.")
    return True
