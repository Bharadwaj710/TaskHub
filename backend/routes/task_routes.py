from flask import Blueprint
from controllers.task_controller import TaskController
from middleware.auth import token_required, admin_required

task_bp = Blueprint('tasks', __name__)
my_tasks_bp = Blueprint('my_tasks', __name__)

task_bp.route('', methods=['POST'], strict_slashes=False)(token_required(TaskController.create_task))
task_bp.route('/upload-image', methods=['POST'], strict_slashes=False)(token_required(TaskController.upload_image))
task_bp.route('', methods=['GET'], strict_slashes=False)(token_required(TaskController.get_tasks))
task_bp.route('/status', methods=['PATCH'], strict_slashes=False)(token_required(TaskController.update_status))
task_bp.route('/activities', methods=['GET'], strict_slashes=False)(token_required(TaskController.get_activities))
task_bp.route('/<int:task_id>', methods=['GET'], strict_slashes=False)(token_required(TaskController.get_task))
task_bp.route('/<int:task_id>/assign', methods=['POST'], strict_slashes=False)(token_required(admin_required(TaskController.assign_task)))
task_bp.route('/<int:task_id>/start', methods=['PUT'], strict_slashes=False)(token_required(TaskController.start_task))
task_bp.route('/<int:task_id>/submit', methods=['POST'], strict_slashes=False)(token_required(TaskController.submit_task))
task_bp.route('/<int:task_id>/accept', methods=['PUT'], strict_slashes=False)(token_required(admin_required(TaskController.accept_task)))
task_bp.route('/<int:task_id>/request-revision', methods=['PUT'], strict_slashes=False)(token_required(admin_required(TaskController.request_revision)))
task_bp.route('/<int:task_id>', methods=['DELETE'], strict_slashes=False)(token_required(TaskController.delete_task))
task_bp.route('/<int:task_id>', methods=['PUT'], strict_slashes=False)(token_required(TaskController.update_task))
task_bp.route('/analytics', methods=['GET'], strict_slashes=False)(token_required(admin_required(TaskController.get_analytics)))

my_tasks_bp.route('/my-tasks', methods=['GET'], strict_slashes=False)(token_required(TaskController.get_my_tasks))
