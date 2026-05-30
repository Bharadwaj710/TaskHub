import time
from .base_provider import AIProvider

class MockProvider(AIProvider):
    def generate_image(self, prompt: str, base_image_url: str, image_type: str) -> str:
        """
        Simulates AI generation by sleeping for 5 seconds and returning a mock image URL.
        """
        time.sleep(5)
        
        # Return a placeholder image based on the type
        if "White" in image_type:
            return "https://placehold.co/800x800/ffffff/cccccc.png?text=White+Background"
        elif "Luxury" in image_type:
            return "https://placehold.co/800x800/1a1a1a/gold.png?text=Luxury+Theme"
        elif "Creative" in image_type:
            return "https://placehold.co/800x800/8a2be2/ffffff.png?text=Creative+Vibe"
        else:
            return f"https://placehold.co/800x800/cccccc/000000.png?text={image_type.replace(' ', '+')}"
