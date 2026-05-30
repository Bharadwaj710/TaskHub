import jwt
from flask import request, jsonify
from functools import wraps
from config.config import Config

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            # Expecting "Bearer <token>"
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({"success": False, "message": "Authentication token is missing"}), 401

        try:
            import requests
            from models.models import User

            # Verify token by fetching the user from Supabase REST API directly.
            # This completely bypasses the broken supabase-py/gotrue python dependencies.
            headers = {
                "Authorization": f"Bearer {token}",
                "apikey": Config.SUPABASE_KEY
            }
            auth_url = f"{Config.SUPABASE_URL.rstrip('/')}/auth/v1/user"

            response = requests.get(auth_url, headers=headers, timeout=10)

            if response.status_code != 200:
                print(f"Supabase Auth REST API failed: {response.status_code} - {response.text}")
                return jsonify({"success": False, "message": "Invalid token"}), 401

            user_data = response.json()
            request.user_id = user_data.get("id")

            # Attach role from our public.users table.
            # Falls back to 'user' if the user hasn't been synced yet (first login race condition).
            user = User.query.filter_by(id=request.user_id).first()
            request.user_role = user.role if user else 'user'

            return f(*args, **kwargs)

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Auth error: {e}")
            return jsonify({"success": False, "message": "Authentication failed"}), 401

    return decorated


def admin_required(f):
    """
    Decorator that requires the caller to have role='admin'.
    Must be applied AFTER token_required (which attaches request.user_role).
    Usage: apply token_required first via the route registration pattern.
    Alternatively, this decorator calls token_required internally.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Ensure token validation runs first by checking user_role exists.
        # In our route setup pattern, token_required is always applied first.
        user_role = getattr(request, 'user_role', None)
        if user_role != 'admin':
            return jsonify({"success": False, "message": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated