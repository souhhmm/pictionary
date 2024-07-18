import { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import RoomPage from "./components/RoomPage";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";
import CreateRoomForm from "./components/CreateRoomForm";
import JoinRoomForm from "./components/JoinRoomForm";

const server = import.meta.env.VITE_SERVER_URL;
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);

export default function App() {
  const [user, setUser] = useState(null);
  const [roomID, setRoomID] = useState("");

  const generateId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  useEffect(() => {
    socket.on("userIsJoined", (data) => {
      if (data.success) {
        console.log("user joined");
      } else {
        console.log("user not joined");
      }
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<CreateRoomForm socket={socket} setUser={setUser} uid={generateId} />} />
      <Route path="/:roomId" element={<RoomPage socket={socket} user={user} />} />
      <Route path="/join" element={<JoinRoomForm socket={socket} setUser={setUser} uid={generateId} />} />
    </Routes>
  );
}
