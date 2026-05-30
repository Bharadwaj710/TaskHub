import os
import requests
import time
from .base_provider import AIProvider

class ReplicateProvider(AIProvider):
    def __init__(self):
        self.api_token = os.environ.get("REPLICATE_API_TOKEN")
        
    def generate_image(self, prompt: str, base_image_url: str, image_type: str) -> str:
        """
        Calls Replicate API to generate an image.
        Uses a product photography inpainting model to ensure exact consistency.
        """
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN is not set")
            
        # Example model: stability-ai/stable-diffusion-inpainting (or a specialized product model)
        # Note: A real implementation for EXACT consistency would involve background removal
        # to create an alpha mask, then passing it to inpainting.
        # For simplicity in this demo, we'll call a generic SD inpainting or img2img endpoint.
        
        headers = {
            "Authorization": f"Token {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # This is a generic Replicate API call structure
        # In a production scenario, you would use a specific model version and specific inputs
        payload = {
            "version": "8beff3369e81422112d93b89ca01426147de542cd4684c244b673b1051661150", # Example SDXL Inpainting version
            "input": {
                "prompt": prompt,
                "image": base_image_url,
                "prompt_strength": 0.8 # Keep high consistency
            }
        }
        
        response = requests.post("https://api.replicate.com/v1/predictions", headers=headers, json=payload)
        response.raise_for_status()
        
        prediction = response.json()
        prediction_id = prediction["id"]
        
        # Poll for completion
        while True:
            time.sleep(2)
            poll_resp = requests.get(f"https://api.replicate.com/v1/predictions/{prediction_id}", headers=headers)
            poll_resp.raise_for_status()
            result = poll_resp.json()
            
            status = result["status"]
            if status == "succeeded":
                # Replicate usually returns a list of output URLs for SD
                output = result.get("output")
                if isinstance(output, list) and len(output) > 0:
                    return output[0]
                elif isinstance(output, str):
                    return output
                else:
                    raise Exception("Unexpected output format from Replicate")
            elif status == "failed":
                raise Exception(f"Replicate generation failed: {result.get('error')}")
            elif status == "canceled":
                raise Exception("Replicate generation canceled")
