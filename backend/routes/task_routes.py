from flask import Blueprint
from controllers.task_controller import TaskController
from middleware.auth import token_required, admin_required

task_bp = Blueprint('tasks', __name__)

task_bp.route('', methods=['POST'], strict_slashes=False)(token_required(admin_required(TaskController.create_task)))
task_bp.route('/upload-image', methods=['POST'], strict_slashes=False)(token_required(TaskController.upload_image))
task_bp.route('', methods=['GET'], strict_slashes=False)(token_required(TaskController.get_tasks))
task_bp.route('/status', methods=['PATCH'], strict_slashes=False)(token_required(TaskController.update_status))
task_bp.route('/activities', methods=['GET'], strict_slashes=False)(token_required(TaskController.get_activities))
task_bp.route('/<int:task_id>', methods=['DELETE'], strict_slashes=False)(token_required(TaskController.delete_task))
task_bp.route('/<int:task_id>', methods=['PUT'], strict_slashes=False)(token_required(TaskController.update_task))
task_bp.route('/analytics', methods=['GET'], strict_slashes=False)(token_required(admin_required(TaskController.get_analytics)))