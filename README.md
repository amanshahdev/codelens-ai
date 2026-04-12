# CodeLens AI

CodeLens AI is a full-stack code review platform that lets developers submit code snippets or files, receive automated analysis, and track review results in a dashboard. It combines a React frontend with an Express/MongoDB backend, JWT-based authentication, file upload support, and an AI-assisted review engine.

## What the app does

- User registration and login
- Code submission as pasted code or uploaded files
- Automated analysis with scoring, findings, and recommendations
- Dashboard views for recent activity and submission history
- Reviewer tools for broader submission access and leaderboard-style insights
- Profile management for authenticated users

## Tech Stack

- Frontend: React, React Router, Axios, Recharts, React Syntax Highlighter
- Backend: Node.js, Express, Mongoose, JWT, Multer, CORS, express-rate-limit
- Database: MongoDB
- AI review layer: rule-based analysis with optional Hugging Face API support

## Project Structure

- `backend/` - Express API, database connection, controllers, middleware, models, routes, and upload storage
- `frontend/` - React single-page application, pages, layout components, shared UI, and API helpers

### Backend highlights

- `server.js` - application entry point and route registration
- `config/db.js` - MongoDB connection setup
- `config/aiService.js` - code analysis engine
- `controllers/` - business logic for auth, users, code submissions, and analysis
- `routes/` - API endpoints for auth, users, code, and analysis
- `middleware/` - authentication, error handling, and file upload handling
- `models/` - MongoDB schemas for users, submissions, and analyses

### Frontend highlights

- `src/App.js` - routing and auth guards
- `src/context/AuthContext.js` - authentication state
- `src/components/layout/` - app shell, sidebar, and navbar
- `src/pages/` - login, register, dashboard, submissions, analysis, profile, reviewer, and submit code screens
- `src/utils/api.js` - API client setup

## Prerequisites

- Node.js and npm
- MongoDB connection string
- Optional: Hugging Face API token for enhanced AI analysis

## Environment Variables

Create a `backend/.env` file and define the variables your deployment needs:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - secret used to sign authentication tokens
- `JWT_EXPIRE` - token lifetime, for example `7d`
- `PORT` - backend port, defaults to `5000`
- `FRONTEND_URL` - allowed frontend origin in production
- `HF_API_TOKEN` - optional Hugging Face API token for AI-assisted analysis

Do not commit real secrets to version control.

## Running Locally

Install dependencies in both apps first:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm start
```

The frontend runs on `http://localhost:3000` and proxies API requests to the backend at `http://localhost:5000`.

## Build

To create a production frontend build:

```bash
cd frontend
npm run build
```

## API Overview

Main backend routes include:

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/auth/me`, `PUT /api/auth/profile`, and `PUT /api/auth/password`
- `POST /api/code` for code submission and `GET /api/code` for submission history
- `GET /api/analysis/:submissionId` for review results
- `GET /api/users/me/profile` for the signed-in user profile

## Notes

- Uploaded files are stored under `backend/uploads/` in local development.
- The backend includes rate limiting and protected routes for authenticated access.
- Reviewer-specific views are available for users with the reviewer role.
