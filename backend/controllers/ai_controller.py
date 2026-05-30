from flask import request
from middleware.auth import token_required
from utils.responses import api_response
from services.ai_service import AIService
from models.models import Task, db

class AIController:
    @staticmethod
    def generate_image(task_id):
        data = request.get_json()
        if not data:
            return api_response(False, "Payload is required", status_code=400)
            
        prompt = data.get("prompt")
        image_type = data.get("image_type")
        
        if not prompt or not image_type:
            return api_response(False, "Prompt and image_type are required", status_code=400)
            
        try:
            # Check permissions first
            task = db.session.get(Task, task_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            if str(task.created_by) != request.user_id and str(task.assigned_to) != request.user_id:
                return api_response(False, "Access denied", status_code=403)
                
            job_id = AIService.submit_generation_job(task_id, request.user_id, prompt, image_type)
            return api_response(True, "Generation job submitted", {"job_id": job_id}, status_code=202)
            
        except ValueError as ve:
            return api_response(False, str(ve), status_code=400)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def get_job_status(job_id):
        try:
            status_data = AIService.get_job_status(job_id)
            if not status_data:
                return api_response(False, "Job not found", status_code=404)
            return api_response(True, "Job status retrieved", status_data)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def get_task_generations(task_id):
        try:
            # Check permissions
            task = db.session.get(Task, task_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            if str(task.created_by) != request.user_id and str(task.assigned_to) != request.user_id:
                return api_response(False, "Access denied", status_code=403)
                
            data = AIService.get_task_generations(task_id)
            return api_response(True, "Generations retrieved", data)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def delete_generation(generation_id):
        try:
            success = AIService.delete_generation(generation_id, request.user_id)
            if not success:
                return api_response(False, "Image not found", status_code=404)
            return api_response(True, "Generation deleted successfully")
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)
