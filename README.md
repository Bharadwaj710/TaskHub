# OpsPulse: Real-Time Collaborative Task Management Platform

OpsPulse is a high-performance, collaborative task management application built with a modern decoupled architecture. It features a responsive Next.js frontend (with support for Dark Mode) and a secured Flask REST API backend, backed by PostgreSQL database and Google OAuth via Supabase.

<br />

<div align="center">
  <table>
    <tr>
      <td align="center"><b>Secure Google Authentication</b></td>
      <td align="center"><b>Clean Light Mode Dashboard</b></td>
    </tr>
    <tr>
      <td><img src="screenshots/1-login.png" alt="Login Page" width="400"/></td>
      <td><img src="screenshots/2-dashboard-light.png" alt="Dashboard Light Mode" width="400"/></td>
    </tr>
    <tr>
      <td align="center"><b>Task Management Modals</b></td>
      <td align="center"><b>Native Dark Mode Engine</b></td>
    </tr>
    <tr>
      <td><img src="screenshots/3-edit-task.png" alt="Edit Task" width="400"/></td>
      <td><img src="screenshots/4-dashboard-dark.png" alt="Create Task Dark Mode" width="400"/></td>
    </tr>
  </table>
</div>

<br />

---

## 🌟 Key Features

* **Real-time Synchronization**: Fully interactive dashboard leveraging PostgreSQL realtime replication. Updates reflect instantly across all active client browsers.
* **Premium Design & Accessibility**: Premium Tailwind CSS styling, native smooth transitioning Dark Mode, and a responsive drawer navigation optimized for desktop, tablet, and mobile views.
* **Optimistic UI Status Updates**: Status updates are processed optimistically inside the client browser. Badges and lists update instantly, with self-healing rollbacks in case of network or API errors.
* **Activity Logs & Timeline**: A centralized audit trail component visualizing user actions, task creations, status updates, and assignment logs.
* **Secured Backend Services**: Backend access validation rules ensuring that only task creators can edit/delete, and only task creators or assigned users can update status.
* **Automated SMTP Email Notifications**: Integrated SMTP email service dispatching automatic task-completion notifications to creators.

---

## 🛠 Tech Stack

### Frontend
* **Core**: Next.js 15 (App Router, TypeScript)
* **Styling**: Tailwind CSS
* **Animations**: Framer Motion (for smooth layouts and card-hover transitions)
* **Auth**: Supabase Client SDK (Google OAuth)

### Backend
* **Core**: Flask, Flask-SQLAlchemy (PostgreSQL dialect)
* **Realtime Services**: Supabase Realtime replication engine
* **Database migrations**: Flask-Migrate
* **Unit Testing**: Python `unittest` framework

---

## ⚙️ Configuration & Environment Variables

### 1. Backend Config (`/backend/.env`)
Create a `.env` file inside the `backend` folder:
```env
FLASK_ENV=development
SECRET_KEY=your-flask-secret-key
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_KEY=your-supabase-service-role-key

# Email Notification Server Config (Gmail example)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

### 2. Frontend Config (`/frontend/.env.local`)
Create a `.env.local` file inside the `frontend` folder:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🚀 Running the Project

### Step 1: Run the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   .\venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Flask server:
   ```bash
   python app.py
   ```
   The backend will start on `http://localhost:5000`.

### Step 2: Run Backend Tests
To run unit and integration tests:
```bash
cd backend
python -m unittest test_tasks.py
```

### Step 3: Run the Frontend App
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`.

4. Build the application for production production deployment check:
   ```bash
   npm run build
   ```
