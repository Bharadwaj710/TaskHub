from flask import Blueprint
from controllers.auth_controller import AuthController
from middleware.auth import token_required

auth_bp = Blueprint('auth', __name__)

# Called by the frontend after Google/GitHub login to sync user profile and get role
auth_bp.route('/auth/sync', methods=['POST'])(token_required(AuthController.sync_user))

# Returns current user profile including role — used by frontend to re-validate role
auth_bp.route('/auth/me', methods=['GET'])(token_required(AuthController.get_me))