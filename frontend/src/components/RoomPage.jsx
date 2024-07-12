import React, { useState, useEffect } from "react";
import Canvas from "./Canvas";
import { useParams, useNavigate } from "react-router-dom";

export default function RoomPage({ socket, user }) {
  const { roomId } = useParams();
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const roomData = {
      name: user.name,
      userId: user.userId,
      roomId,
      host: user.host,
    };

    socket.emit("userJoined", roomData);

    socket.on("updateUsersOnline", (updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => {
      socket.emit("leaveRoom", roomId);
      socket.disconnect();
    };
  }, [roomId, socket, user]);

  const handleLeaveRoom = () => {
    socket.emit("leaveRoom", roomId);
    navigate("/");
  };

  return (
    <>
      <div className="flex mx-2 my-2">
        {user.host && (
          <>
            <label htmlFor="color">Color Picker</label>
            <input
              type="color"
              id="color"
              className="mx-2 border bg-white border-gray-200 p-1 cursor-pointer rounded-lg"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </>
        )}
        <span className="mx-2 text-primary">(Users Online: {users.length})</span>
        <button className="ml-auto border-2 w-32" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
      {user.host && (
        <div className="flex flex-col mx-2 my-2">
          <label htmlFor="pencil" className="flex items-center">
            <input
              type="radio"
              name="tool"
              id="pencil"
              checked={tool === "pencil"}
              value="pencil"
              className="mr-2"
              onChange={(e) => setTool(e.target.value)}
            />
            Pencil
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="tool"
              id="line"
              checked={tool === "line"}
              value="line"
              className="mr-2"
              onChange={(e) => setTool(e.target.value)}
            />
            Line
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="tool"
              id="eraser"
              checked={tool === "eraser"}
              value="eraser"
              className="mr-2"
              onChange={(e) => setTool(e.target.value)}
            />
            Eraser
          </label>
        </div>
      )}
      <Canvas tool={tool} color={color} socket={socket} user={{ ...user, roomId }} />
      <div className="flex flex-col mx-2 my-2">
        <h3 className="font-bold">Users in Room:</h3>
        {users.map((user) => (
          <div key={user.userId} className="border p-2 my-2">
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>User ID:</strong> {user.userId}
            </p>
            <p>
              <strong>Host:</strong> {user.host ? "Yes" : "No"}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
