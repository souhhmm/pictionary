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

app.get("/", (req, res) => {
  res.send("Server is running");
});

const startHostTimer = (roomId) => {
  let remainingTime = 60;
  const users = rooms[roomId];

  const timerInterval = setInterval(() => {
    remainingTime -= 1;
    io.to(roomId).emit("timerUpdate", remainingTime);

    if (remainingTime <= 0) {
      clearInterval(timerInterval);

      if (users && users.length > 1) {
        const currentHostIndex = users.findIndex((user) => user.host);
        let nextHostIndex = (currentHostIndex + 1) % users.length;
        while (nextHostIndex === currentHostIndex) {
          nextHostIndex = (nextHostIndex + 1) % users.length;
        }

        users[currentHostIndex].host = false;
        users[nextHostIndex].host = true;

        io.to(roomId).emit("updateUsersOnline", users);
        // Emit hostChanged event to all users in the room
        io.to(roomId).emit("hostChanged", users[nextHostIndex]);

        // Reset the canvas
        io.to(roomId).emit("resetCanvas");
      }
    }
  }, 1000); // 1 second
};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host } = data;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    rooms[roomId].push({ name, userId, host, socketId: socket.id });

    console.log(`User joined: ${JSON.stringify(data)}`);
    console.log(`Users in room ${roomId}: ${JSON.stringify(rooms[roomId])}`);

    io.to(roomId).emit("updateUsersOnline", rooms[roomId]);
  });

  socket.on("leaveRoom", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((user) => user.socketId !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("updateUsersOnline", rooms[roomId]);
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
    startHostTimer(roomId); // Start the host timer
  });

  socket.on("disconnecting", () => {
    const socketRooms = Object.keys(socket.rooms);
    socketRooms.forEach((roomId) => {
      if (roomId !== socket.id && rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((user) => user.socketId !== socket.id);
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit("updateUsersOnline", rooms[roomId]);
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
