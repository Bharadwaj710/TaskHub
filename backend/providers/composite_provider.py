import io
import requests
from PIL import Image
from rembg import remove
from .base_provider import AIProvider
import os

class CompositeProvider(AIProvider):
    def generate_image(self, prompt: str, base_image_url: str, image_type: str) -> str:
        """
        Uses rembg to extract the product from the base_image_url and Pillow to composite it onto 
        a predefined template background corresponding to the image_type.
        Returns the path to a temporarily saved local file which AIService will upload to Supabase.
        """
        
        # 1. Download or read the original product image
        if base_image_url.startswith("file://"):
            file_path = base_image_url.replace("file://", "")
            with open(file_path, "rb") as f:
                input_image_bytes = f.read()
        else:
            response = requests.get(base_image_url)
            response.raise_for_status()
            input_image_bytes = response.content
        
        # 2. Remove background using rembg
        extracted_bytes = remove(input_image_bytes)
        product_img = Image.open(io.BytesIO(extracted_bytes)).convert("RGBA")
        
        # 3. Determine the background template based on the requested image_type
        # Default to a plain white background
        bg_path = None
        templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "templates")
        
        if "White" in image_type:
            bg_path = "white" # Special case, generate pure white
        elif "Luxury" in image_type:
            bg_path = os.path.join(templates_dir, "velvet.png")
        elif "Marble" in image_type or "Theme" in image_type: # Fallback for Theme 2
            bg_path = os.path.join(templates_dir, "marble.png")
        elif "Beach" in image_type or "Creative" in image_type:
            bg_path = os.path.join(templates_dir, "beach.png")
        elif "Cyber" in image_type:
            bg_path = os.path.join(templates_dir, "cyberpunk.png")
        elif "Front" in image_type:
            bg_path = os.path.join(templates_dir, "model_front.png")
        elif "Side" in image_type:
            bg_path = os.path.join(templates_dir, "model_side.png")
        elif "Close" in image_type:
            bg_path = os.path.join(templates_dir, "model_closeup.png")
        else:
            bg_path = os.path.join(templates_dir, "velvet.png") # Fallback
            
        # 4. Load or create the background
        if bg_path == "white":
            bg_img = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
        else:
            try:
                bg_img = Image.open(bg_path).convert("RGBA")
            except Exception as e:
                print(f"Failed to load background template at {bg_path}: {e}")
                # Fallback to white if template is missing
                bg_img = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
        
        # Resize background to a standard size
        bg_img = bg_img.resize((1024, 1024))
        
        # 5. Calculate positioning and scale for the product
        bg_w, bg_h = bg_img.size
        
        # Scale product to fit within a reasonable portion of the background
        max_product_size = int(bg_w * 0.6) # Product takes up at most 60% of the canvas
        product_img.thumbnail((max_product_size, max_product_size), Image.Resampling.LANCZOS)
        pw, ph = product_img.size
        
        # Calculate paste coordinates (Center it for now, can be adjusted based on type)
        offset_x = (bg_w - pw) // 2
        offset_y = (bg_h - ph) // 2
        
        # If model, shift it up slightly to place it around the neck
        if "Model" in image_type:
            offset_y = int(bg_h * 0.4) - (ph // 2)
            
        # 6. Composite the image
        bg_img.paste(product_img, (offset_x, offset_y), product_img)
        
        # Convert back to RGB for saving as standard image
        final_img = bg_img.convert("RGB")
        
        # 7. Save to memory buffer and return bytes instead of URL?
        # Wait, the current AIProvider interface returns a string URL.
        # But this runs locally! We can't return a local URL to AIService unless AIService knows how to handle it.
        # The Replicate/Mock providers return HTTP URLs.
        # Let's save it to a temporary file, and we will update AIService to handle local file paths if the URL doesn't start with "http".
        import tempfile
        temp_dir = tempfile.gettempdir()
        import uuid
        temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}.png")
        final_img.save(temp_file_path, format="PNG")
        
        # Prefix with file:// so AIService knows it's a local file
        return f"file://{temp_file_path}"
