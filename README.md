# TaskPilot 🚀
A real-time AI-driven task management platform built with the MERN Stack.

## Features
- ⚡ **Real-Time Sync:** Instant updates across all clients using Socket.io.
- 🤖 **AI Priority Engine:** Automatically tags tasks (High/Medium/Low) based on deadlines and keywords.
- ⏳ **Smart Deadlines:** Live countdown timers with visual status indicators.
- 🔔 **Notifications:** Browser alerts for upcoming deadlines (10 min warning) and overdue tasks.

## Tech Stack
- **Frontend:** Next.js, Tailwind CSS, Axios
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB

## Getting Started

### 1. Clone the repo
git clone https://github.com/Hueman007/TaskPilot.git

### 2. Install Backend
cd server

npm install


# Create a .env file and add: MONGO_URI=your_mongodb_string

npm start


### 3. Install Frontend

cd ../client

npm install

npm run dev