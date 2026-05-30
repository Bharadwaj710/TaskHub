import os
import shutil
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.providers.composite_provider import CompositeProvider

provider = CompositeProvider()
test_image_url = f"file://{os.path.abspath('test_pearl.png')}"

output_dir = "generated_samples"
os.makedirs(output_dir, exist_ok=True)

types = [
    ("01_white_background.png", "White Background"),
    ("02_theme_luxury_velvet.png", "Luxury Theme"),
    ("03_theme_marble_surface.png", "Marble Theme"),
    ("04_creative_beach_sunset.png", "Creative Beach"),
    ("05_creative_neon_cyberpunk.png", "Cyber Theme"),
    ("06_model_front_view.png", "Model Front View"),
    ("07_model_side_angle.png", "Model Side View"),
    ("08_model_closeup.png", "Model Close Up")
]

for filename, image_type in types:
    print(f"Generating {image_type}...")
    try:
        temp_file_url = provider.generate_image("prompt", test_image_url, image_type)
        temp_file_path = temp_file_url.replace("file://", "")
        shutil.move(temp_file_path, os.path.join(output_dir, filename))
        print(f"Successfully generated {filename}")
    except Exception as e:
        print(f"Error generating {filename}: {e}")

print("Done generating real samples!")
