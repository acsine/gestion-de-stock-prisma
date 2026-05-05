import subprocess
import os
import socket
import sys
import time
from pathlib import Path

# Configuration
DB_NAME = "gestionstock"
DB_USER = "postgres"
DB_PASS = "FOMO"
PORT = 3000

def run_command(command, shell=True, check=True, env=None):
    """Executes a command and returns the output."""
    try:
        result = subprocess.run(
            command,
            shell=shell,
            check=check,
            capture_output=True,
            text=True,
            env={**os.environ, **(env or {})}
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {command}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        if check:
            sys.exit(1)
        return None

def check_command(cmd):
    """Checks if a command exists in the system PATH."""
    return subprocess.run(f"where {cmd}", shell=True, capture_output=True).returncode == 0

def get_local_ip():
    """Gets the local IP address of the machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def install_with_winget(package_id, name):
    """Installs a package using winget."""
    print(f"--- Installing {name} ({package_id}) ---")
    run_command(f"winget install {package_id} --silent --accept-package-agreements --accept-source-agreements")
    print(f"--- {name} installed successfully ---")

def find_psql():
    """Tries to find the psql executable in common locations if not in PATH."""
    if check_command("psql"):
        return "psql"
    
    paths = list(Path("C:/Program Files/PostgreSQL").glob("**/bin/psql.exe"))
    if paths:
        return str(paths[0])
    
    return None

def main():
    print("=== System Setup & Server Launcher ===")

    # 1. Install PostgreSQL if missing
    if not find_psql():
        install_with_winget("PostgreSQL.PostgreSQL", "PostgreSQL")
        print("Waiting for PostgreSQL service to start...")
        time.sleep(10)
    else:
        print("[OK] PostgreSQL is already installed.")

    # 2. Install mkcert if missing
    if not check_command("mkcert"):
        install_with_winget("mkcert", "mkcert")
        run_command("mkcert -install")
    else:
        print("[OK] mkcert is already installed.")

    # 3. Create Database if not exists
    psql_path = find_psql()
    if not psql_path:
        print("[ERROR] psql not found even after installation. Please restart your terminal or add PostgreSQL bin to PATH.")
        sys.exit(1)

    print(f"--- Ensuring database '{DB_NAME}' exists ---")
    # Set password environment variable for psql
    env = {"PGPASSWORD": DB_PASS}
    
    # Check if DB exists
    check_db_cmd = f'"{psql_path}" -U {DB_USER} -lqt'
    dbs = run_command(check_db_cmd, env=env, check=False)
    
    if dbs and DB_NAME in dbs:
        print(f"[OK] Database '{DB_NAME}' already exists.")
    else:
        print(f"Creating database '{DB_NAME}'...")
        run_command(f'"{psql_path}" -U {DB_USER} -c "CREATE DATABASE {DB_NAME};"', env=env)
        print(f"[OK] Database '{DB_NAME}' created.")

    # 4. Prisma Setup
    print("--- Running Prisma initialization ---")
    run_command("npx prisma generate")
    run_command("npx prisma db push")


if __name__ == "__main__":
    main()
