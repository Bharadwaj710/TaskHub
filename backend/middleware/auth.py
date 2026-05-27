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
            # 1. Try local JWT decoding (fast, secure, no network call)
            if Config.SUPABASE_JWT_SECRET:
                try:
                    header = jwt.get_unverified_header(token)
                    alg = header.get("alg", "HS256")
                    print(f"DEBUG JWT: header={header}")
                    
                    try:
                        # Try decoding with the raw secret string
                        payload = jwt.decode(
                            token,
                            Config.SUPABASE_JWT_SECRET,
                            algorithms=[alg],
                            audience="authenticated"
                        )
                    except jwt.InvalidSignatureError:
                        # Fallback: decode with base64-decoded secret bytes
                        import base64
                        try:
                            # Pad the base64 secret to avoid incorrect padding exception
                            padded_secret = Config.SUPABASE_JWT_SECRET + "=" * (-len(Config.SUPABASE_JWT_SECRET) % 4)
                            decoded_secret = base64.b64decode(padded_secret)
                            payload = jwt.decode(
                                token,
                                decoded_secret,
                                algorithms=[alg],
                                audience="authenticated"
                            )
                        except Exception:
                            raise
                            
                    request.user_id = payload.get("sub")
                    return f(*args, **kwargs)
                except jwt.ExpiredSignatureError:
                    return jsonify({"success": False, "message": "Token has expired"}), 401
                except jwt.InvalidTokenError as jwt_err:
                    print(f"Local JWT decode failed, trying Supabase client: {jwt_err}")
            
            # 2. Fallback to Supabase client fetch if local decode fails or secret not set
            from supabase import create_client, Client
            
            # Initialize Supabase client
            supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
            
            # Verify token by fetching the user from Supabase directly
            user_response = supabase.auth.get_user(token)
            
            if not user_response.user:
                return jsonify({"success": False, "message": "Invalid token"}), 401
                
            request.user_id = user_response.user.id
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Auth error: {e}")
            return jsonify({"success": False, "message": "Authentication failed"}), 401

        return f(*args, **kwargs)
    return decorated