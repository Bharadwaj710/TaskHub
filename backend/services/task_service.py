from models.models import db, Task, ActivityLog, User
from datetime import datetime
from services.email_service import EmailService

class TaskService:
    @staticmethod
    def create_task(data, user_id):
        assigned_to = data.get('assigned_to')
        status = 'Assigned' if assigned_to else 'Pending'
        assigned_at = datetime.utcnow() if assigned_to else None
        
        task = Task(
            title=data['title'],
            description=data.get('description', ''),
            status=status,
            created_by=user_id,
            assigned_to=assigned_to,
            assigned_at=assigned_at,
            product_image_url=data.get('product_image_url')
        )
        db.session.add(task)
        db.session.flush() # Flush to get the task.id without committing yet
        
        # Log the activity
        log = ActivityLog(
            task_id=task.id, 
            action="Task Created", 
            performed_by=user_id,
            old_value=None,
            new_value={"status": status}
        )
        db.session.add(log)
        
        db.session.commit() # Single commit for both task and log
        
        # Send Email Notification if assigned
        if task.assigned_to:
            # Fetch both users in a single query
            users = User.query.filter(User.id.in_([task.assigned_to, user_id])).all()
            user_map = {str(u.id): u for u in users}
            
            assignee = user_map.get(str(task.assigned_to))
            assigner = user_map.get(str(user_id))
            
            if assignee and assignee.email:
                assigner_name = assigner.name if assigner else "A team member"
                EmailService.send_task_assigned_email(assignee.email, task.title, assigner_name)
        
        return task

    @staticmethod
    def get_user_tasks(user_id):
        # Get tasks created by user OR assigned to user
        return Task.query.filter(
            (Task.created_by == user_id) | (Task.assigned_to == user_id)
        ).order_by(Task.created_at.desc()).all()

    @staticmethod
    def update_task_status(task_id, status, user_id):
        task = db.session.get(Task, task_id)
        if not task:
            return None
        
        created_by_str = str(task.created_by) if task.created_by else None
        assigned_to_str = str(task.assigned_to) if task.assigned_to else None
        user_id_str = str(user_id) if user_id else None
        
        is_creator = (created_by_str == user_id_str)
        is_assignee = (assigned_to_str == user_id_str)
        
        if not is_creator and not is_assignee:
            raise PermissionError("You do not have access to update this task")
        
        old_status = task.status
        if old_status == status:
            return task # No change
            
        # Strict State Machine Logic
        if is_assignee and not is_creator:
            if status == 'In Progress' and old_status not in ['Assigned', 'Revision Requested']:
                raise PermissionError("You can only transition to In Progress from Assigned or Revision Requested")
            elif status == 'Submitted' and old_status != 'In Progress':
                raise PermissionError("You can only submit a task that is In Progress")
            elif status not in ['In Progress', 'Submitted']:
                raise PermissionError(f"Assignees cannot change status to {status}")
                
        if is_creator:
            if status in ['Accepted', 'Revision Requested'] and old_status != 'Submitted':
                raise PermissionError("You can only accept or request revision on Submitted tasks")
            elif status not in ['Accepted', 'Revision Requested', 'Pending', 'In Progress', 'Assigned', 'Submitted']:
                raise PermissionError("Invalid transition")

        # Update Status and Timestamps
        task.status = status
        if status == 'Submitted':
            task.submitted_at = datetime.utcnow()
        elif status == 'Accepted':
            task.accepted_at = datetime.utcnow()
            task.completed_at = datetime.utcnow()
        elif status == 'In Progress' and old_status == 'Assigned':
            pass
            
        # Flush to persist status before logging
        db.session.flush()
        
        # Write JSON to Audit Log
        log = ActivityLog(
            task_id=task.id, 
            action=f"Status changed to {status}", 
            performed_by=user_id,
            old_value={"status": old_status},
            new_value={"status": status}
        )
        db.session.add(log)
        
        db.session.commit()
        
        # Fetch users for notifications
        user_ids_to_fetch = [uid for uid in [user_id, task.created_by, task.assigned_to] if uid]
        users = User.query.filter(User.id.in_(user_ids_to_fetch)).all()
        user_map = {str(u.id): u for u in users}
        
        actor = user_map.get(user_id_str)
        actor_name = actor.name if actor else "A team member"
        
        creator = user_map.get(created_by_str)
        assignee = user_map.get(assigned_to_str)
        
        # Email Notifications
        if status == 'Submitted' and creator and creator.email and created_by_str != user_id_str:
            EmailService.send_task_submitted_email(creator.email, task.title, actor_name)
            
        elif status == 'Accepted' and assignee and assignee.email and assigned_to_str != user_id_str:
            EmailService.send_task_accepted_email(assignee.email, task.title, actor_name)
            
        elif status == 'Revision Requested' and assignee and assignee.email and assigned_to_str != user_id_str:
            EmailService.send_revision_requested_email(assignee.email, task.title, actor_name)
            
        elif status == 'Completed' and old_status != 'Completed':
            if creator and creator.email and created_by_str != user_id_str:
                EmailService.send_task_completed_email(creator.email, task.title, actor_name)
            if assignee and assignee.email and assigned_to_str != user_id_str and assigned_to_str != created_by_str:
                EmailService.send_task_completed_email(assignee.email, task.title, actor_name)
        
        return task

    @staticmethod
    def delete_task(task_id, user_id):
        task = db.session.get(Task, task_id)
        if not task:
            return None
        
        created_by_str = str(task.created_by) if task.created_by else None
        user_id_str = str(user_id) if user_id else None
        if created_by_str != user_id_str:
            raise PermissionError("Only the creator can delete this task")
        
        # Delete related activity logs
        ActivityLog.query.filter_by(task_id=task_id).delete()
        
        db.session.delete(task)
        db.session.commit()
        return True

    @staticmethod
    def update_task(task_id, data, user_id):
        task = db.session.get(Task, task_id)
        if not task:
            return None
        
        created_by_str = str(task.created_by) if task.created_by else None
        user_id_str = str(user_id) if user_id else None
        if created_by_str != user_id_str:
            raise PermissionError("Only the creator can edit this task")
        
        old_assignee = task.assigned_to
        old_assignee_str = str(old_assignee) if old_assignee else None
        
        task.title = data.get('title', task.title)
        task.description = data.get('description', task.description)
        
        assigned_to = data.get('assigned_to')
        if assigned_to == 'unassigned' or not assigned_to:
            task.assigned_to = None
            if task.status == 'Assigned':
                task.status = 'Pending'
                task.assigned_at = None
        else:
            task.assigned_to = assigned_to
            if not old_assignee or old_assignee_str != str(assigned_to):
                task.assigned_at = datetime.utcnow()
                if task.status == 'Pending':
                    task.status = 'Assigned'
            
        db.session.flush()
        
        log = ActivityLog(
            task_id=task.id, 
            action="Task Updated", 
            performed_by=user_id,
            old_value={"assigned_to": old_assignee_str},
            new_value={"assigned_to": task.assigned_to}
        )
        db.session.add(log)
        db.session.commit() # Single commit
        
        # Send Email Notification if assignee changed
        assigned_to_str = str(task.assigned_to) if task.assigned_to else None
        if assigned_to_str and assigned_to_str != old_assignee_str:
            users = User.query.filter(User.id.in_([task.assigned_to, user_id])).all()
            user_map = {str(u.id): u for u in users}
            
            assignee = user_map.get(assigned_to_str)
            assigner = user_map.get(user_id_str)
            
            if assignee and assignee.email:
                assigner_name = assigner.name if assigner else "A team member"
                EmailService.send_task_assigned_email(assignee.email, task.title, assigner_name)
                
        return task

    @staticmethod
    def get_activities(user_id):
        tasks = Task.query.filter(
            (Task.created_by == user_id) | (Task.assigned_to == user_id)
        ).all()
        task_ids = [t.id for t in tasks]
        if not task_ids:
            return []
        
        logs = ActivityLog.query.filter(
            ActivityLog.task_id.in_(task_ids)
        ).order_by(ActivityLog.created_at.desc()).limit(50).all()
        return logs