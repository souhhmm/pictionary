import { useState, useEffect } from "react";
// import HomePage from "./components/HomePage";
import RoomPage from "./components/RoomPage";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";
import CreateRoomForm from "./components/CreateRoomForm";
import JoinRoomForm from "./components/JoinRoomForm";

const server = import.meta.env.VITE_SERVER_URL;
// const server = 'http://localhost:5000/';
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);

export default function App() {
  const [user, setUser] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Handle socket connection events
    socket.on("connect", () => {
      console.log("Connected to server");
      setSocketConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
      setSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setSocketConnected(false);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Reconnected after", attemptNumber, "attempts");
      setSocketConnected(true);
    });

    socket.on("reconnect_error", (error) => {
      console.error("Reconnection error:", error);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("reconnect_error");
    };
  }, []);

  const generateId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";  
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // useEffect(() => {
  //   socket.on("userIsJoined", (data) => {
  //     if (data.success) {
  //       console.log("user joined");
  //     } else {
  //       console.log("user not joined");
  //     }
  //   });
  // }, []);

  return (
    <div>
      {!socketConnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          Connecting to server...
        </div>
      )}
      <Routes>
        <Route path="/" element={<CreateRoomForm setUser={setUser} uid={generateId} />} />
        <Route path="/:roomId" element={<RoomPage socket={socket} user={user} />} />
        <Route path="/join" element={<JoinRoomForm setUser={setUser} uid={generateId} />} />
      </Routes>
    </div>
  );
}
