import { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import RoomPage from "./components/RoomPage";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";

const server = "http://localhost:5000";
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);

export default function App() {
  const [user, setUser] = useState("");
  useEffect(() => {
    socket.on("userIsJoined", (data) => {
      if (data.success) {
        console.log("user joined");
      } else {
        console.log("user not joined");
      }
    });
  });

  return (
    <Routes>
      <Route path="/" element={<HomePage socket={socket} setUser={setUser} />}></Route>
      <Route path="/:roomId" element={<RoomPage />}></Route>
    </Routes>
  );
}
