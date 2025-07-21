# pictionary

A real-time multiplayer drawing and guessing game inspired by [skribbl.io](https://skribbl.io/).

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/souhhmm/pictionary.git
   cd pictionary
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Create `.env` file:
   ```bash
   cd frontend
   echo "VITE_SERVER_URL=http://localhost:5000" > .env
   ```

## Running Locally

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```
   The server will run on `http://localhost:5000` by default.

2. In a new terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3000` by default. You can optionally use the `--host` flag (`npm run dev -- --host`) to allow others on the same network to connect.