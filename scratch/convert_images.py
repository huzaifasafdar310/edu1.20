from PIL import Image
import os

assets_dir = r"c:\Users\Safdar\Desktop\New folder\edu ai 1.2\assets"
files = ["icon.png", "adaptive-icon.png", "splash.png"]

for filename in files:
    filepath = os.path.join(assets_dir, filename)
    if os.path.exists(filepath):
        print(f"Converting {filename} to real PNG...")
        try:
            with Image.open(filepath) as img:
                # Force save as PNG
                img.save(filepath, "PNG")
            print(f"Successfully converted {filename}")
        except Exception as e:
            print(f"Failed to convert {filename}: {e}")
    else:
        print(f"File {filename} not found")
