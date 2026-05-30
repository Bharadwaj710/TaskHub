from flask import request
from models.models import db, User
from config.config import Config
from utils.responses import api_response

class AuthController:
    @staticmethod
    def sync_user():
        data = request.get_json(silent=True)
        user_id = getattr(request, 'user_id', None)
        print(f"DEBUG: sync_user called. user_id={user_id}, data={data}")

        if not data or 'email' not in data:
            return api_response(False, f"Email is required. Received: {data}", status_code=400)

        try:
            email = data.get('email', '').lower().strip()
            user = User.query.filter_by(id=user_id).first()

            # Determine role: auto-promote if email matches ADMIN_EMAIL env var
            is_admin_email = bool(Config.ADMIN_EMAIL and email == Config.ADMIN_EMAIL)
            assigned_role = 'admin' if is_admin_email else 'user'

            if not user:
                # First login: create the user record
                user = User(
                    id=user_id,
                    name=data.get('name', 'New User'),
                    email=email,
                    avatar_url=data.get('avatar_url'),
                    role=assigned_role
                )
                db.session.add(user)
                db.session.commit()
                print(f"DEBUG: New user created. email={email}, role={assigned_role}")
                return api_response(True, "User synced successfully", {
                    "id": user.id,
                    "role": user.role
                })

            # Existing user: re-apply admin promotion on every sync (idempotent).
            # This handles the case where ADMIN_EMAIL is set after first login.
            if is_admin_email and user.role != 'admin':
                user.role = 'admin'
                db.session.commit()
                print(f"DEBUG: User promoted to admin. email={email}")

            return api_response(True, "User already synced", {
                "id": user.id,
                "role": user.role
            })

        except Exception as e:
            print(f"Sync Error: {str(e)}")
            return api_response(False, f"Internal server error: {str(e)}", status_code=500)

    @staticmethod
    def get_me():
        """Return current authenticated user's profile including role."""
        user_id = getattr(request, 'user_id', None)
        try:
            user = User.query.filter_by(id=user_id).first()
            if not user:
                return api_response(False, "User not found", status_code=404)
            return api_response(True, "User fetched", {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "role": user.role
            })
        except Exception as e:
            return api_response(False, str(e), status_code=500)