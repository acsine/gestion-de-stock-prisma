import zipfile
import shutil
import os

zip_path = "public/setup_thaborsolution.zip"
temp_zip_path = "public/setup_thaborsolution_temp.zip"

print(f"Updating {zip_path}...")

if not os.path.exists(zip_path):
    print(f"Error: {zip_path} not found!")
    exit(1)

with zipfile.ZipFile(zip_path, 'r') as zin:
    with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            # Standardize path separators to match zip format
            normalized_name = item.filename.replace('\\', '/')
            if normalized_name == "setup.bat":
                print("Replacing setup.bat in zip...")
                zout.write("setup.bat", "setup.bat")
            elif normalized_name == "setup.py":
                print("Replacing setup.py in zip...")
                zout.write("setup.py", "setup.py")
            elif normalized_name == "prisma/seed.ts":
                print("Replacing prisma/seed.ts in zip...")
                zout.write("prisma/seed.ts", "prisma/seed.ts")
            else:
                data = zin.read(item.filename)
                zout.writestr(item, data)

# Replace the original zip with the updated zip
if os.path.exists(temp_zip_path):
    os.remove(zip_path)
    shutil.move(temp_zip_path, zip_path)
    print("Zip updated successfully!")
else:
    print("Error: Temporary zip was not created.")
