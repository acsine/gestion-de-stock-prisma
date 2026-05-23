import struct
import os

def convert_png_to_ico(png_path, ico_path):
    if not os.path.exists(png_path):
        print(f"Error: {png_path} not found.")
        return False
        
    print(f"Converting {png_path} to {ico_path}...")
    with open(png_path, "rb") as f:
        png_data = f.read()
    
    png_size = len(png_data)
    
    # ICO Header: Reserved (0), Type (1), Count (1)
    header = struct.pack("<HHH", 0, 1, 1)
    
    # Directory Entry:
    # Width (0 represents 256), Height (0 represents 256), Colors (0), Reserved (0),
    # Planes (1), BitCount (32), Size of PNG data, Offset where PNG data starts (22 bytes)
    directory = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, png_size, 22)
    
    with open(ico_path, "wb") as f:
        f.write(header)
        f.write(directory)
        f.write(png_data)
        
    print("Conversion successful!")
    return True

if __name__ == "__main__":
    convert_png_to_ico("icon.png", "icon.ico")
