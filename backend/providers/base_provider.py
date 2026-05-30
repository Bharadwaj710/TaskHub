from abc import ABC, abstractmethod

class AIProvider(ABC):
    @abstractmethod
    def generate_image(self, prompt: str, base_image_url: str, image_type: str) -> str:
        """
        Generates an image based on the prompt and base image.
        Returns the URL or bytes of the generated image.
        """
        pass
