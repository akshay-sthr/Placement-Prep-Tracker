# Placement Prep Tracker

A full-stack web app to prepare for campus placements. Track DSA problems, revise them with spaced repetition, log mock interviews, and see a single readiness score that shows how prepared you are.

Built with **Node.js, Express, MongoDB (Mongoose)** and a **vanilla JavaScript** frontend.

---

## Features

- **Landing page** with Login and Create account options
- **Authentication** with JWT (HS256, 7-day expiry), scrypt password hashing
- **Forgot password** with a 6-digit OTP sent by email (Nodemailer + Gmail)
- **Problem tracker**: log problems by topic, difficulty and status (solved / stuck), with search and filters
- **Spaced repetition**: review reminders at 1, 3, 7, 14, 30 and 60 days
- **Dashboard**: streaks, activity heatmap, topic and difficulty charts (Chart.js)
- **Mock interviews**: record ratings, company and notes, with a rating chart
- **Readiness score**: combines DSA progress, mock ratings, profile and consistency, and lists weak topics
- **Interview question generator**: random DSA, OOP, DBMS, OS, Networking and HR questions
- **AI assistant and study plan**: uses OpenAI when a key is set, otherwise built-in answers
- **Admin dashboard**: total students, problems, mocks and the newest users
- **Profile page** with college, graduation year, target role, skills and bio
- **Light and dark theme**, responsive layout

---

## Tech stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | Node.js 18+, Express 4                       |
| Database  | MongoDB with Mongoose                        |
| Auth      | JWT (HMAC-SHA256), Node `crypto` scrypt      |
| Email     | Nodemailer (Gmail App Password)              |
| Frontend  | HTML, CSS, vanilla JavaScript, Chart.js      |
| Testing   | Node built-in test runner (`node --test`)    |
| Deploy    | Docker, Render                               |

---

## Folder structure

```
placement-tracker/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/         # URL -> controller mapping
│   │   │   └── controllers/    # request / response handling
│   │   ├── models/             # User, Problem, Mock (Mongoose schemas)
│   │   ├── services/           # token, password, OTP, email, readiness, AI
│   │   ├── middleware/         # auth, dbReady, errorHandler
│   │   ├── config/             # env, database connection, mailer
│   │   ├── constants/          # topics, difficulties, allowed fields
│   │   ├── utils/              # date helpers, asyncHandler, small helpers
│   │   ├── app.js              # builds the Express app
│   │   └── server.js           # connects to MongoDB and starts the server
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── frontend/                   # index.html, app.js, style.css, favicon.png
├── Dockerfile
├── render.yaml
└── README.md
```

How a request flows:

```
Browser -> app.js -> api/routes -> middleware (auth) -> api/controllers -> services -> models -> MongoDB
```

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- MongoDB, either local (MongoDB Community Server) or a free MongoDB Atlas cluster

### Installation

```bash
git clone <your-repo-url>
cd placement-tracker/backend
npm install
```

### Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

| Variable         | Required | Description                                                         |
| ---------------- | -------- | ------------------------------------------------------------------- |
| `PORT`           | No       | Server port (default `8000`)                                        |
| `MONGODB_URI`    | Yes      | MongoDB connection string                                           |
| `JWT_SECRET`     | Yes      | Long random string used to sign tokens (required in production)     |
| `ADMIN_EMAIL`    | Yes      | The account registered with this email becomes the admin            |
| `EMAIL_USER`     | No       | Gmail address used to send password-reset OTPs                      |
| `EMAIL_PASS`     | No       | Gmail App Password (16 characters, no spaces)                       |
| `OPENAI_API_KEY` | No       | Enables real AI answers; without it, built-in answers are used      |
| `OPENAI_MODEL`   | No       | OpenAI model name (default `gpt-5-mini`)                            |

Generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Run

```bash
npm run dev      # development, restarts on file changes
npm start        # production
npm test         # run tests
```

Open **http://localhost:8000**.

### Pages

| URL                     | Page                            |
| ----------------------- | ------------------------------- |
| `/#home`                | Landing page                    |
| `/#login`               | Login form                      |
| `/#signup`              | Create account form             |
| `/#dashboard` and others | App pages (login required)     |

---

## Roles

- **student** (default): can see and manage only their own data.
- **admin**: the user who registers with the email set in `ADMIN_EMAIL`. Gets the Admin tab with platform-wide counts.

---

## API reference

All routes start with `/api`. Routes marked 🔒 need the header `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint                    | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/auth/register`            | Create an account                    |
| POST   | `/auth/login`               | Log in, returns a token              |
| POST   | `/auth/send-otp`            | Email a password-reset OTP           |
| POST   | `/auth/verify-otp`          | Check an OTP                         |
| POST   | `/auth/reset-password-otp`  | Set a new password with a valid OTP  |
| GET    | `/auth/me` 🔒               | Current user                         |

### Profile

| Method | Endpoint     | Description        |
| ------ | ------------ | ------------------ |
| GET    | `/profile` 🔒 | Get profile        |
| PUT    | `/profile` 🔒 | Update profile     |

### Problems and spaced repetition

| Method | Endpoint                   | Description                                   |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/problems` 🔒             | List problems (filters: `q`, `topic`, `difficulty`, `status`) |
| POST   | `/problems` 🔒             | Add a problem                                 |
| PUT    | `/problems/:id` 🔒         | Update a problem                              |
| DELETE | `/problems/:id` 🔒         | Delete a problem                              |
| GET    | `/reviews/due` 🔒          | Problems due for review                       |
| POST   | `/problems/:id/review` 🔒  | Record a review (`{ "remembered": true }`)    |
| POST   | `/seed` 🔒                 | Add sample data to an empty tracker           |

### Mock interviews

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| GET    | `/mocks` 🔒       | List mock interviews |
| POST   | `/mocks` 🔒       | Add a mock interview |
| DELETE | `/mocks/:id` 🔒   | Delete one           |

### Insights

| Method | Endpoint                  | Description                         |
| ------ | ------------------------- | ----------------------------------- |
| GET    | `/stats` 🔒               | Dashboard numbers, streaks, heatmap |
| GET    | `/readiness` 🔒           | Readiness score and weak topics     |
| GET    | `/interviews/questions` 🔒 | 5 random interview questions        |
| POST   | `/ai/assistant` 🔒        | Ask the placement assistant         |
| POST   | `/ai/study-plan` 🔒       | Generate a study plan (1 to 30 days)|

### Admin

| Method | Endpoint           | Description                       |
| ------ | ------------------ | --------------------------------- |
| GET    | `/admin/overview` 🔒 | Totals and newest users (admin only) |

---

## How spaced repetition works

After you solve a problem, the first review is due in 1 day. Each time you remember it, the gap grows: **1, 3, 7, 14, 30, 60 days**. After the last review the problem is marked as mastered. Forgetting a problem sends it back to the start.

## How the readiness score is calculated

| Component    | Weight | Based on                                         |
| ------------ | ------ | ------------------------------------------------ |
| DSA          | 45%    | Problems solved, with a bonus for hard problems  |
| Mock         | 25%    | Average mock interview rating                    |
| Profile      | 15%    | College, graduation year, target role, skills    |
| Consistency  | 15%    | Number of different topics practiced and solved  |

---

## Docker

```bash
docker build -t placement-tracker .
docker run -p 8000:8000 --env-file backend/.env placement-tracker
```

If MongoDB runs on your own machine, use `host.docker.internal` instead of `127.0.0.1` in `MONGODB_URI`.

## Deploy on Render

The included `render.yaml` sets up the web service. Create a new Blueprint on Render from your repository, then add these environment variables in the dashboard: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `EMAIL_USER`, `EMAIL_PASS` and optionally `OPENAI_API_KEY`. MongoDB Atlas works well as the database.

---

## Security notes

- Never commit your `.env` file. It is already listed in `.gitignore`.
- Use a long random `JWT_SECRET`. The server refuses to start in production without one.
- OTP codes are stored in memory, so they reset when the server restarts. For multiple servers, store them in MongoDB or Redis.
- Tokens are not stored on the server, so a token stays valid until it expires (7 days).

## Author

Made by **Akshay**.
