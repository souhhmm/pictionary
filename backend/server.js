const express = require("express");
const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

//routes
app.get("/", (req, res) => {
  res.send("Server is running");
});

io.on("connection", (socket) => {
  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host } = data;
    socket.join(roomId);
    socket.emit("userIsJoined", { success: true });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
