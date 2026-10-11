# AI Personal Finance Tracker

A full-stack web application built using the MERN stack (MongoDB, Express.js, React.js, Node.js) to help you track your income and expenses, visualize your spending patterns, and get AI-powered financial suggestions using the OpenAI API.

## Features
- **Secure Authentication**: JWT-based user login and hashed passwords using bcrypt.
- **Dynamic Dashboard**: Responsive UI with dark mode, glassmorphism, and Recharts integration for visualizing total balance, income, and expenses.
- **Transaction Management**: Add, view, and organize transactions effortlessly.
- **Budgeting**: Set a monthly budget and get alerts if you exceed your limit.
- **AI Insights**: Automatically analyze your transactions to generate financial tips using the OpenAI API with gpt-4o-mini.

## Prerequisites
- **Node.js** installed
- **MongoDB** running locally, or a MongoDB Atlas URI
- **OpenAI API Key** (Get yours from the OpenAI platform)

## Environment Configuration
For security, sensitive data is not hardcoded. You need to configure the `.env` file for the backend server.

Inside the `server/` directory, edit the `.env` file with your actual keys:

```env
MONGO_URI=mongodb://127.0.0.1:27017/ai-finance
JWT_SECRET=supersecret1234
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## Setup Instructions

### 1. Backend Setup
Navigate to the `server/` directory, open a terminal, and start the development server:
```bash
cd server
node server.js
```
*(Runs on port 5000)*

### 2. Frontend Setup
Navigate to the `client/` directory, open a separate terminal, and start Vite:
```bash
cd client
npm run dev
```
*(Runs on port 5173)*

Once both servers are running, access the application in your browser. Register an account and start managing your finances!
