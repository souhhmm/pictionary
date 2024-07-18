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

const wordsList = ["Compact", "Magnificent", "Timesaving", "Dark", "Malevolence", "Tree", "Damage", "Man", "Termination", "Dangerous", "Mascot", "Underestimate"];
const ROUND_TIME = 20;
const SCORE = 100;

app.get("/", (req, res) => {
  res.send("Server is running");
});

const startHostTimer = (roomId) => {
  let remainingTime = ROUND_TIME;
  const users = rooms[roomId].users;

  const timerInterval = setInterval(() => {
    remainingTime -= 1;
    io.to(roomId).emit("timerUpdate", remainingTime);

    if (remainingTime <= 0) {
      clearInterval(timerInterval);

      if (users && users.length > 1) {
        const currentHostIndex = users.findIndex((user) => user.host);
        let nextHostIndex = (currentHostIndex + 1) % users.length;

        users[currentHostIndex].host = false;
        users[nextHostIndex].host = true;

        if (nextHostIndex === 0) {
          rooms[roomId].round += 1;
          io.to(roomId).emit("roundUpdate", rooms[roomId].round);
        }

        io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
        io.to(roomId).emit("hostChanged", users[nextHostIndex]);
        io.to(roomId).emit("stopTimer");
        io.to(roomId).emit("resetCanvas");
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
    socket.to(roomId).emit("canvasData", { imageData });
  });

  socket.on("sendMessage", (message) => {
    const { roomId } = message;
    io.to(roomId).emit("receiveMessage", message);
  });

  socket.on("startRound", (roomId) => {
    const randomWords = getRandomWords();
    io.to(roomId).emit("randomWords", randomWords);
    startHostTimer(roomId);
    io.to(roomId).emit("roundUpdate", rooms[roomId].round);
  });

  socket.on("wordChosen", ({ roomId, word }) => {
    io.to(roomId).emit("chosenWord", word);
  });

  const updateAndBroadcastScores = (roomId, userId, points) => {
    const users = rooms[roomId].users;
    if (users) {
      const user = users.find((user) => user.userId === userId);
      if (user) {
        user.score = (user.score || 0) + points;
        io.to(roomId).emit(
          "updateScores",
          users.map(({ userId, score }) => ({ userId, score }))
        );
      }
    }
  };

  socket.on("correctGuess", ({ roomId, userId }) => {
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
