from flask import request
from services.task_service import TaskService
from utils.responses import api_response

class TaskController:
    @staticmethod
    def serialize_task(task):
        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "created_by": task.created_by,
            "created_by_name": task.creator.name if task.creator else "Unknown",
            "assigned_to": task.assigned_to,
            "assigned_to_name": task.assignee.name if task.assignee else "Unassigned",
            "product_image_url": getattr(task, 'product_image_url', None),
            "submitted_at": task.submitted_at if hasattr(task, 'submitted_at') else None,
            "accepted_at": task.accepted_at if hasattr(task, 'accepted_at') else None,
            "revision_note": getattr(task, 'revision_note', None),
            "assigned_at": task.assigned_at if hasattr(task, 'assigned_at') else None,
            "created_at": task.created_at
        }

    @staticmethod
    def create_task():
        data = request.get_json()
        if not data or 'title' not in data:
            return api_response(False, "Title is required", status_code=400)
        
        try:
            task = TaskService.create_task(data, request.user_id)
            return api_response(True, "Task created successfully", {
                "id": task.id, 
                "title": task.title, 
                "status": task.status
            }, 201)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def upload_image():
        if 'file' not in request.files:
            return api_response(False, "No file provided", status_code=400)
            
        file = request.files['file']
        if file.filename == '':
            return api_response(False, "No file selected", status_code=400)
            
        # Validate extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if ext not in allowed_extensions:
            return api_response(False, "Invalid file type. Allowed: png, jpg, jpeg, webp", status_code=400)
            
        # Validate size
        file_bytes = file.read()
        if len(file_bytes) > 5 * 1024 * 1024:
            return api_response(False, "File size exceeds 5MB limit", status_code=400)
            
        try:
            import uuid
            import requests
            from config.config import Config
            
            filename = f"{uuid.uuid4()}.{ext}"
            
            # Using Supabase Storage REST API as a client isn't configured in the backend
            url = f"{Config.SUPABASE_URL.rstrip('/')}/storage/v1/object/product-images/{filename}"
            auth_key = Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_KEY
            headers = {
                "Authorization": f"Bearer {auth_key}",
                "apikey": auth_key,
                "Content-Type": file.content_type
            }
            
            response = requests.post(url, headers=headers, data=file_bytes, timeout=15)
            
            if response.status_code != 200:
                print(f"Storage upload failed: {response.text}")
                return api_response(False, "Failed to upload image to storage", status_code=500)
                
            public_url = f"{Config.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/product-images/{filename}"
            
            return api_response(True, "Image uploaded successfully", {"url": public_url})
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return api_response(False, f"Upload error: {str(e)}", status_code=500)

    @staticmethod
    def get_tasks():
        try:
            tasks = TaskService.get_user_tasks(request.user_id)
            data = [TaskController.serialize_task(t) for t in tasks]
            return api_response(True, "Tasks fetched successfully", data)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def get_task(task_id):
        try:
            task = TaskService.get_accessible_task(task_id, request.user_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            return api_response(True, "Task fetched successfully", TaskController.serialize_task(task))
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def get_my_tasks():
        return TaskController.get_tasks()

    @staticmethod
    def assign_task(task_id):
        data = request.get_json(silent=True) or {}
        assigned_to = data.get('assigned_to')
        if not assigned_to:
            return api_response(False, "assigned_to is required", status_code=400)

        try:
            task = TaskService.update_task(task_id, {"assigned_to": assigned_to}, request.user_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            return api_response(True, "Task assigned successfully", TaskController.serialize_task(task))
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def start_task(task_id):
        return TaskController.update_task_status_alias(task_id, "In Progress", "Task started successfully")

    @staticmethod
    def submit_task(task_id):
        return TaskController.update_task_status_alias(task_id, "Submitted", "Task submitted successfully")

    @staticmethod
    def accept_task(task_id):
        return TaskController.update_task_status_alias(task_id, "Accepted", "Task accepted successfully")

    @staticmethod
    def request_revision(task_id):
        return TaskController.update_task_status_alias(task_id, "Revision Requested", "Revision requested successfully")

    @staticmethod
    def update_task_status_alias(task_id, status, success_message):
        try:
            task = TaskService.update_task_status(task_id, status, request.user_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            return api_response(True, success_message, {"id": task.id, "status": task.status})
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def update_status():
        data = request.get_json(silent=True) or {}
        task_id = data.get('id')
        status = data.get('status')
        
        if not task_id or not status:
            return api_response(False, "Task ID and status are required", status_code=400)
            
        valid_statuses = {'Pending', 'Assigned', 'In Progress', 'Submitted', 'Accepted', 'Revision Requested', 'Completed'}
        if status not in valid_statuses:
            return api_response(False, f"Invalid status. Must be one of {list(valid_statuses)}", status_code=400)
            
        try:
            task = TaskService.update_task_status(task_id, status, request.user_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            return api_response(True, "Status updated successfully", {"id": task.id, "status": task.status})
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def delete_task(task_id):
        try:
            success = TaskService.delete_task(task_id, request.user_id)
            if success is None:
                return api_response(False, "Task not found", status_code=404)
            return api_response(True, "Task deleted successfully")
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def update_task(task_id):
        data = request.get_json()
        if not data:
            return api_response(False, "Data is required", status_code=400)
        
        try:
            task = TaskService.update_task(task_id, data, request.user_id)
            if not task:
                return api_response(False, "Task not found", status_code=404)
            return api_response(True, "Task updated successfully", {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "assigned_to": task.assigned_to
            })
        except PermissionError as pe:
            return api_response(False, str(pe), status_code=403)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def get_activities():
        try:
            from models.models import Task, User
            logs = TaskService.get_activities(request.user_id)
            data = []
            for log in logs:
                task = Task.query.get(log.task_id)
                user = User.query.get(log.performed_by)
                data.append({
                    "id": log.id,
                    "task_id": log.task_id,
                    "task_title": task.title if task else "Deleted Task",
                    "action": log.action,
                    "performed_by": log.performed_by,
                    "performed_by_name": user.name if user else "Unknown",
                    "created_at": log.created_at
                })
            return api_response(True, "Activity logs fetched successfully", data)
        except Exception as e:
            return api_response(False, str(e), status_code=500)

    @staticmethod
    def get_analytics():
        try:
            analytics_data = TaskService.get_analytics()
            return api_response(True, "Analytics retrieved successfully", analytics_data)
        except Exception as e:
            return api_response(False, str(e), status_code=500)
