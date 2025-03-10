const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const wordsList = require("./words");

const ROUND_TIME = 60;

app.get("/", (req, res) => {
  res.send("Server is running");
});

const startHostTimer = (roomId) => {
  if (!rooms[roomId] || !rooms[roomId].users) {
    console.error(`Room ${roomId} does not exist or has no users.`);
    return;
  }

  let remainingTime = ROUND_TIME;
  rooms[roomId].remainingTime = remainingTime;
  const users = rooms[roomId].users;
  rooms[roomId].correctGuesses = [];
  rooms[roomId].timerInterval = setInterval(() => {
    if (!rooms[roomId]) {
      clearInterval(rooms[roomId].timerInterval);
      return;
    }

    remainingTime -= 1;
    rooms[roomId].remainingTime = remainingTime;
    io.to(roomId).emit("timerUpdate", remainingTime);

    if (remainingTime <= 0) {
      clearInterval(rooms[roomId].timerInterval);
      changeHost(roomId);
    }
  }, 1000);
  io.to(roomId).emit("startTimer");
};

const stopHostTimer = (roomId) => {
  if (rooms[roomId] && rooms[roomId].timerInterval) {
    clearInterval(rooms[roomId].timerInterval);
    rooms[roomId].timerInterval = null;
  }
};

const changeHost = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  const users = room.users;
  if (users.length > 1) {
    const currentHostIndex = users.findIndex((user) => user.host);
    if (currentHostIndex === -1) {
      console.error("No host found in the room.");
      return;
    }

    let nextHostIndex = (currentHostIndex + 1) % users.length;

    users[currentHostIndex].host = false;
    users[nextHostIndex].host = true;

    if (nextHostIndex === 0) {
      room.round = (room.round || 1) + 1;
      io.to(roomId).emit("roundUpdate", room.round);
    }

    io.to(roomId).emit("updateUsersOnline", users);
    io.to(roomId).emit("hostChanged", users[nextHostIndex]);
    io.to(roomId).emit("stopTimer");
    io.to(roomId).emit("resetCanvas");

    const correctGuesses = room.correctGuesses;
    if (correctGuesses.length > 0) {
      const totalTimeTaken = correctGuesses.reduce((sum, guess) => sum + guess.timeTaken, 0);
      const averageTimeTaken = totalTimeTaken / correctGuesses.length;
      const hostPoints = averageTimeTaken * 10;

      const host = users[currentHostIndex];
      host.score = (host.score || 0) + hostPoints;

      io.to(roomId).emit(
        "updateScores",
        users.map(({ userId, score }) => ({ userId, score }))
      );
    }

    stopHostTimer(roomId);
  } else {
    console.warn(`Not enough users to proceed to the next round in room ${roomId}.`);
  }
};

const getRandomWords = () => {
  const shuffled = wordsList.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host } = data;
    if (!roomId || !name || !userId) {
      console.error("Invalid data for userJoined event:", data);
      return;
    }

    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { users: [], round: 1, correctGuesses: [] };
    }

    rooms[roomId].users.push({ name, userId, host, score: 0, socketId: socket.id });

    console.log(`User joined: ${JSON.stringify(data)}`);
    console.log(`Users in room ${roomId}: ${JSON.stringify(rooms[roomId].users)}`);

    io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
  });

  socket.on("leaveRoom", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].users = rooms[roomId].users.filter((user) => user.socketId !== socket.id);
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
      }
    }
    socket.leave(roomId);
  });

  socket.on("canvasData", (data) => {
    const { roomId, imageData } = data;
    if (!roomId || !imageData) {
      console.error("Invalid data for canvasData event:", data);
      return;
    }

    socket.to(roomId).emit("canvasData", { imageData });
  });

  socket.on("sendMessage", (message) => {
    const { roomId } = message;
    if (!roomId) {
      console.error("Invalid data for sendMessage event:", message);
      return;
    }

    io.to(roomId).emit("receiveMessage", message);
  });

  socket.on("startRound", (roomId) => {
    if (!rooms[roomId]) {
      console.error(`Room ${roomId} does not exist.`);
      return;
    }

    const randomWords = getRandomWords();
    io.to(roomId).emit("randomWords", randomWords);
    startHostTimer(roomId);
    io.to(roomId).emit("roundUpdate", rooms[roomId].round);
  });

  socket.on("wordChosen", ({ roomId, word }) => {
    if (!roomId || !word) {
      console.error("Invalid data for wordChosen event:", { roomId, word });
      return;
    }

    io.to(roomId).emit("chosenWord", word);
  });

  const updateAndBroadcastScores = (roomId, userId, points, timeTaken = null) => {
    if (!rooms[roomId] || !rooms[roomId].users) {
      console.error(`Room ${roomId} does not exist or has no users.`);
      return;
    }

    const users = rooms[roomId].users;
    const user = users.find((user) => user.userId === userId);
    if (user) {
      user.score = (user.score || 0) + points;

      if (timeTaken !== null) {
        rooms[roomId].correctGuesses.push({ userId, timeTaken });
      }

      io.to(roomId).emit(
        "updateScores",
        users.map(({ userId, score }) => ({ userId, score }))
      );

      const host = users.find((user) => user.host);
      const nonHostUsers = users.filter((user) => !user.host);
      const allNonHostUsersGuessed = nonHostUsers.every((user) => rooms[roomId].correctGuesses.some((guess) => guess.userId === user.userId));

      if (allNonHostUsersGuessed && host) {
        changeHost(roomId);
      }
    } else {
      console.error(`User ${userId} not found in room ${roomId}.`);
    }
  };

  socket.on("correctGuess", ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.error("Invalid data for correctGuess event:", { roomId, userId });
      return;
    }

    const remainingTime = rooms[roomId]?.remainingTime || 0;
    const timeTaken = ROUND_TIME - remainingTime;
    const points = remainingTime * 10;

    updateAndBroadcastScores(roomId, userId, points, timeTaken);
  });

  socket.on("disconnecting", () => {
    const socketRooms = Array.from(socket.rooms);
    socketRooms.forEach((roomId) => {
      if (roomId !== socket.id && rooms[roomId]) {
        rooms[roomId].users = rooms[roomId].users.filter((user) => user.socketId !== socket.id);
        if (rooms[roomId].users.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
        }
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
