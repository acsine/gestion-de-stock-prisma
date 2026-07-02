import zipfile
import shutil
import os
import subprocess

# 1. Run npm run build
print("Building the application (npm run build)...")
try:
    subprocess.run("npm run build", shell=True, check=True)
    print("Build succeeded!")
except subprocess.CalledProcessError as e:
    print(f"Error: Build failed: {e}")
    exit(1)

zip_path = "public/setup_thaborsolution.zip"

print(f"Creating a new setup zip at {zip_path}...")

# Ensure public directory exists
os.makedirs("public", exist_ok=True)

# Remove old zip if it exists
if os.path.exists(zip_path):
    os.remove(zip_path)

# List of files and folders to include
files_to_include = [
    "package.json",
    "package-lock.json",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "electron-main.js",
    "setup.bat",
    "setup.py",
    "start_app.bat",
    "icon.ico",
    "icon.png",
    "README.md",
]

folders_to_include = [
    ".next",
    "prisma",
    "public",
]

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zout:
    # 1. Add specific files
    for file_name in files_to_include:
        if os.path.exists(file_name):
            print(f"Adding file {file_name}...")
            zout.write(file_name, file_name)

    # 2. Add specific folders
    for folder_name in folders_to_include:
        if os.path.exists(folder_name):
            print(f"Adding folder {folder_name}...")
            for root, dirs, files in os.walk(folder_name):
                # Exclude Next.js build cache to keep ZIP file small
                normalized_root = root.replace('\\', '/')
                if '.next/cache' in normalized_root:
                    continue

                for file in files:
                    full_path = os.path.join(root, file)
                    # Exclude the zip file itself to prevent recursive inclusion
                    if full_path.replace('\\', '/') == zip_path.replace('\\', '/'):
                        continue
                    zout.write(full_path, full_path)

    # 3. Add scratch/sync_initial.ts
    sync_script = "scratch/sync_initial.ts"
    if os.path.exists(sync_script):
        print(f"Adding file {sync_script}...")
        zout.write(sync_script, sync_script)

print(f"ZIP created successfully at {zip_path}!")
