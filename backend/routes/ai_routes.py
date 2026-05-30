from flask import Blueprint
from controllers.ai_controller import AIController
from utils.decorators import token_required

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/tasks/<int:task_id>/generate', methods=['POST'])
@token_required
def generate_image(task_id):
    return AIController.generate_image(task_id)

@ai_bp.route('/jobs/<int:job_id>/status', methods=['GET'])
@token_required
def get_job_status(job_id):
    return AIController.get_job_status(job_id)

@ai_bp.route('/tasks/<int:task_id>/generations', methods=['GET'])
@token_required
def get_task_generations(task_id):
    return AIController.get_task_generations(task_id)

@ai_bp.route('/generations/<int:generation_id>', methods=['DELETE'])
@token_required
def delete_generation(generation_id):
    return AIController.delete_generation(generation_id)
