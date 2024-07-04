const express = require("express");
const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

//routes
app.get("/", (req, res) => {
    res.send("Server is running");
});

io.on("connection", (socket) => { console.log("A user connected") });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`) });