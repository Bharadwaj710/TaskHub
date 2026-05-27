from flask import Flask, jsonify
from flask_cors import CORS
from config.config import Config
from models.models import db
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_app(app)

    @app.route('/')
    def root_health_check():
        return jsonify({"status": "healthy", "service": "NexTask API"}), 200

    with app.app_context():
        # In production, use migrations and avoid running DDL commands on startup.
        is_production = os.getenv("FLASK_ENV") == "production"
        if not is_production:
            db.create_all()
            
            # Concrete fix: Auto-enable Supabase Realtime replication for the tasks table
            try:
                db.session.execute(db.text("ALTER PUBLICATION supabase_realtime ADD TABLE tasks;"))
                db.session.commit()
                print("Successfully enabled Supabase Realtime replication for tasks table.")
            except Exception as e:
                db.session.rollback()
                print(f"Realtime replication config notice (safe to ignore if already added): {str(e)}")

            # Disable RLS on tasks table to guarantee realtime updates work out of the box
            try:
                db.session.execute(db.text("ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;"))
                db.session.commit()
                print("Successfully disabled Row Level Security on tasks table.")
            except Exception as e:
                db.session.rollback()
                print(f"Row Level Security config notice (safe to ignore if not Supabase): {str(e)}")
        else:
            print("Running in production mode: database DDL startup commands and automatic RLS disabling are bypassed.")

    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.task_routes import task_bp
    from routes.user_routes import user_bp
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(task_bp, url_prefix='/api/tasks')
    app.register_blueprint(user_bp, url_prefix='/api/users')

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"success": True, "message": "Backend is running"})

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)