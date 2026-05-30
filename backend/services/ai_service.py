import time
import requests
import uuid
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from flask import current_app
from models.models import db, Task, GeneratedImage, GenerationJob
from config.config import Config
from supabase import create_client

def get_provider():
    # Toggle based on env var (defaulting to composite for Phase 6)
    use_mock = os.environ.get("USE_MOCK_AI", "false").lower() == "true"
    if use_mock:
        from providers.mock_provider import MockProvider
        return MockProvider()
    else:
        from providers.composite_provider import CompositeProvider
        return CompositeProvider()

class AIService:
    # Single global thread pool for background jobs
    executor = ThreadPoolExecutor(max_workers=5)

    @staticmethod
    def submit_generation_job(task_id, user_id, prompt, image_type):
        task = db.session.get(Task, task_id)
        if not task:
            raise ValueError("Task not found")
        if not task.product_image_url:
            raise ValueError("Task has no original product image to process")

        # Create job record
        job = GenerationJob(
            task_id=task_id,
            status='pending'
        )
        db.session.add(job)
        db.session.commit()
        
        job_id = job.id
        base_image_url = task.product_image_url
        
        # Capture current app context to pass to thread
        app = current_app._get_current_object()
        
        # Submit to background thread
        AIService.executor.submit(
            AIService._process_generation_job,
            app, job_id, task_id, user_id, prompt, base_image_url, image_type
        )
        
        return job_id

    @staticmethod
    def _process_generation_job(app, job_id, task_id, user_id, prompt, base_image_url, image_type):
        with app.app_context():
            job = db.session.get(GenerationJob, job_id)
            if not job:
                return
                
            try:
                # Mark as processing
                job.status = 'processing'
                db.session.commit()
                
                # 1. Generate Image URL from Provider
                provider = get_provider()
                generated_url = provider.generate_image(prompt, base_image_url, image_type)
                
                # 2. Download or read the generated image into memory
                if generated_url.startswith("file://"):
                    file_path = generated_url.replace("file://", "")
                    with open(file_path, "rb") as f:
                        image_bytes = f.read()
                    # Clean up the temp file
                    import os
                    if os.path.exists(file_path):
                        os.remove(file_path)
                else:
                    img_response = requests.get(generated_url)
                    img_response.raise_for_status()
                    image_bytes = img_response.content
                
                # 3. Upload to Supabase Storage 'generated_images'
                supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
                file_extension = "png" # Assuming PNG output from SD/Mock
                filename = f"{task_id}/{uuid.uuid4()}.{file_extension}"
                
                # Upload
                res = supabase.storage.from_('generated_images').upload(
                    path=filename,
                    file=image_bytes,
                    file_options={"content-type": "image/png"}
                )
                
                # Get public URL
                public_url = supabase.storage.from_('generated_images').get_public_url(filename)
                
                # 4. Save to generated_images table
                gen_image = GeneratedImage(
                    task_id=task_id,
                    generated_by=user_id,
                    image_type=image_type,
                    image_url=public_url,
                    prompt_used=prompt,
                    job_id=job_id,
                    is_final=False
                )
                db.session.add(gen_image)
                
                # Mark Job as completed
                job.status = 'completed'
                job.completed_at = datetime.utcnow()
                db.session.commit()
                
            except Exception as e:
                db.session.rollback()
                job = db.session.get(GenerationJob, job_id)
                job.status = 'failed'
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                db.session.commit()
                print(f"Generation Job {job_id} failed: {str(e)}")

    @staticmethod
    def get_job_status(job_id):
        job = db.session.get(GenerationJob, job_id)
        if not job:
            return None
        return {
            "id": job.id,
            "status": job.status,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }

    @staticmethod
    def get_task_generations(task_id):
        images = GeneratedImage.query.filter_by(task_id=task_id).order_by(GeneratedImage.created_at.desc()).all()
        return [{
            "id": img.id,
            "task_id": img.task_id,
            "image_type": img.image_type,
            "image_url": img.image_url,
            "prompt_used": img.prompt_used,
            "created_at": img.created_at.isoformat() if img.created_at else None
        } for img in images]

    @staticmethod
    def delete_generation(gen_id, user_id):
        img = db.session.get(GeneratedImage, gen_id)
        if not img:
            return False
            
        task = db.session.get(Task, img.task_id)
        if str(task.created_by) != str(user_id) and str(task.assigned_to) != str(user_id):
            raise PermissionError("You don't have permission to delete this image")
            
        # Delete from Supabase Storage
        try:
            filename = img.image_url.split('/')[-1]
            path = f"{img.task_id}/{filename}"
            supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
            supabase.storage.from_('generated_images').remove([path])
        except Exception as e:
            print(f"Error removing image from storage: {e}")
            
        db.session.delete(img)
        db.session.commit()
        return True
