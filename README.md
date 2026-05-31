# TaskHub: AI Product Photography Task Platform

TaskHub is a full-stack task management platform with an integrated AI Studio for jewelry product campaign generation. Admins create and assign product-photo tasks, users generate the required image variations, and admins review the submitted work.

## Features

- Google and GitHub OAuth through Supabase Auth.
- Role-based access for admin and user workflows.
- Admin task creation, assignment, review, acceptance, revision requests, and analytics.
- User dashboard for assigned work, task progress, and AI Studio access.
- AI Studio generation flow with product-preserving jewelry compositing.
- Eight-image campaign target: white background, luxury themes, creative/lifestyle themes, and model-wearing views.
- Asynchronous generation jobs with polling status.
- Supabase Storage uploads for product and generated images.
- Email notifications for assignment, submission, acceptance, completion, and revisions.
- Activity logging for task lifecycle events.
- Responsive Next.js dashboard with light and dark modes.

> **Note for Evaluators:** For evaluator convenience, authenticated users can create personal tasks and directly access AI Studio without requiring administrator assignment. Administrative workflows remain available for full task management and review.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Flask, SQLAlchemy, Flask-Limiter |
| Auth | Supabase OAuth |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| AI Studio | Python, Pillow, OpenCV/rembg-style product extraction, template compositing |
| Email | SMTP service wrapper |

## Project Structure

```text
backend/                  Flask API, services, models, AI providers
frontend/                 Next.js application
migrations/               Supabase/PostgreSQL migration scripts
screenshots/              UI screenshots for submission
docs/                     Assignment reference and supporting docs
```

## Required API Coverage

TaskHub exposes the assignment-facing API routes while keeping the internal services reusable:

```text
POST   /api/auth/oauth/callback
GET    /api/auth/me
POST   /api/auth/logout

POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
POST   /api/tasks/:id/assign
PUT    /api/tasks/:id/accept
PUT    /api/tasks/:id/request-revision
DELETE /api/tasks/:id

GET    /api/my-tasks
PUT    /api/tasks/:id/start
POST   /api/tasks/:id/submit

POST   /api/tasks/:id/generate
GET    /api/jobs/:job_id/status
GET    /api/tasks/:id/generations
DELETE /api/generations/:id
```

AI generation is rate limited to 10 jobs per hour. General API traffic uses the global Flask-Limiter configuration.

## AI Studio Approach

The assignment requires the product to remain exactly the same across all generated images. TaskHub handles that by preserving the uploaded product pixels and compositing them into controlled scenes instead of asking a generative model to redraw the jewelry.

Pipeline summary:

1. Extract the jewelry from the uploaded product image.
2. Clean halo/edge artifacts around the cutout.
3. Select a variation template based on the requested type and prompt.
4. Scale and place the jewelry using template-aware rules.
5. Apply contact shadows and light blending.
6. Save the generated result to Supabase Storage.
7. Store metadata in `generated_images`.

This is intentionally pragmatic for the assignment: it prioritizes product preservation, predictable outputs, and explainability.



## Environment Setup

### Backend

Create `backend/.env` from `backend/.env.example`.

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ADMIN_EMAIL=admin@example.com
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Running Locally

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

Backend syntax check:

```bash
cd backend
python -m py_compile app.py controllers/*.py routes/*.py services/*.py providers/*.py
```

Frontend production check:

```bash
cd frontend
npm run build
```

## Database Migrations

Apply the SQL files in order through the Supabase SQL Editor:

```text
migrations/001_add_role_to_users.sql
migrations/002_database_refactor.sql
```

## Known Tradeoffs

- The generation worker uses a lightweight in-process background executor instead of Redis/Celery to keep the assignment deployable.
- Email is abstracted behind SMTP instead of a provider-specific SDK.
- Development startup can create tables automatically, but production should rely on migrations.
- Product realism is strongest for front-facing jewelry assets with clean backgrounds.
