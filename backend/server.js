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
const SCORE = 100;

app.get("/", (req, res) => {
  res.send("Server is running");
});

const startHostTimer = (roomId) => {
  if (!rooms[roomId] || !rooms[roomId].users) {
    console.error(`Room ${roomId} does not exist or has no users.`);
    return;
  }

  let remainingTime = ROUND_TIME;
  const users = rooms[roomId].users;

  const timerInterval = setInterval(() => {
    remainingTime -= 1;
    io.to(roomId).emit("timerUpdate", remainingTime);

    if (remainingTime <= 0) {
      clearInterval(timerInterval);

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
          rooms[roomId].round = (rooms[roomId].round || 1) + 1;
          io.to(roomId).emit("roundUpdate", rooms[roomId].round);
        }

        io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
        io.to(roomId).emit("hostChanged", users[nextHostIndex]);
        io.to(roomId).emit("stopTimer");
        io.to(roomId).emit("resetCanvas");
      } else {
        console.warn(`Not enough users to proceed to the next round in room ${roomId}.`);
      }
    }
  }, 1000);
  io.to(roomId).emit("startTimer");
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
      rooms[roomId] = { users: [], round: 1 };
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

  const updateAndBroadcastScores = (roomId, userId, points) => {
    if (!rooms[roomId] || !rooms[roomId].users) {
      console.error(`Room ${roomId} does not exist or has no users.`);
      return;
    }

    const users = rooms[roomId].users;
    const user = users.find((user) => user.userId === userId);
    if (user) {
      user.score = (user.score || 0) + points;
      io.to(roomId).emit(
        "updateScores",
        users.map(({ userId, score }) => ({ userId, score }))
      );
    } else {
      console.error(`User ${userId} not found in room ${roomId}.`);
    }
  };

  socket.on("correctGuess", ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.error("Invalid data for correctGuess event:", { roomId, userId });
      return;
    }

    updateAndBroadcastScores(roomId, userId, SCORE);
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
