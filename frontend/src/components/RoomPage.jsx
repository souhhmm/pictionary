import React, { useState, useEffect, useRef } from "react";
import Canvas from "./Canvas";
import { useParams, useNavigate } from "react-router-dom";

export default function RoomPage({ socket, user }) {
  const { roomId } = useParams();
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isHost, setIsHost] = useState(user.host);
  const [timeLeft, setTimeLeft] = useState(10);
  const [showStartButton, setShowStartButton] = useState(true); // State to control Start Round button visibility
  const [showTimer, setShowTimer] = useState(false); // State to control timer visibility
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

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

    socket.on("receiveMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("hostChanged", (newHost) => {
      setIsHost(newHost.userId === user.userId); // Set host state based on received host information
      resetRound(); // Reset round when host changes
      setShowTimer(false); // Hide timer when host changes
      alert(`Host changed to ${newHost.name}`);
    });

    socket.on("timerUpdate", (remainingTime) => {
      setTimeLeft(remainingTime); // Update time left based on server's timer update
    });

    socket.on("startTimer", () => {
      setShowTimer(true); // Show the timer for all users
    });

    socket.on("stopTimer", () => {
      setShowTimer(false); // Hide the timer for all users
    });

    return () => {
      socket.emit("leaveRoom", roomId);
      socket.disconnect();
    };
  }, [roomId, socket, user]);

  const resetRound = () => {
    clearInterval(timerRef.current);
    setTimeLeft(10); // Reset time left to initial value
    canvasRef.current.resetCanvas();
    setTool("pencil");
    setColor("#000000");
    setShowTimer(false); // Hide timer when round is reset
    setShowStartButton(true); // Show Start Round button again
  };

  const startRound = () => {
    socket.emit("startRound", roomId); // Emit startRound event to server
    setShowStartButton(false); // Hide the Start Round button after pressing it
  };

  const handleLeaveRoom = () => {
    socket.emit("leaveRoom", roomId);
    navigate("/");
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const newMessage = {
      user: user.name,
      text: message,
      roomId,
    };
    socket.emit("sendMessage", newMessage);
    setMessage("");
  };

  return (
    <>
      <div className="flex mx-2 my-2">
        {isHost && showStartButton && users.length > 1 && (
          <button onClick={startRound} className="ml-2 border-2 w-32 bg-green-500 text-white">
            Start Round
          </button>
        )}
        <span className="mx-2 text-primary">(Users Online: {users.length})</span>
        {showTimer && <span className="mx-2 text-red-500">Time Left: {timeLeft}s</span>}
        <button className="ml-auto border-2 w-32" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
      {isHost && !showStartButton && (
        <div className="flex flex-col mx-2 my-2">
          <label htmlFor="color">Color Picker</label>
          <input type="color" id="color" className="mx-2 border bg-white border-gray-200 p-1 cursor-pointer rounded-lg" value={color} onChange={(e) => setColor(e.target.value)} />
          <label htmlFor="pencil" className="flex items-center">
            <input type="radio" name="tool" id="pencil" checked={tool === "pencil"} value="pencil" className="mr-2" onChange={(e) => setTool(e.target.value)} />
            Pencil
          </label>
          <label className="flex items-center">
            <input type="radio" name="tool" id="line" checked={tool === "line"} value="line" className="mr-2" onChange={(e) => setTool(e.target.value)} />
            Line
          </label>
          <label className="flex items-center">
            <input type="radio" name="tool" id="eraser" checked={tool === "eraser"} value="eraser" className="mr-2" onChange={(e) => setTool(e.target.value)} />
            Eraser
          </label>
          <button className="ml-2 border-2 w-32" onClick={() => canvasRef.current.resetCanvas()}>
            Clear Canvas
          </button>
        </div>
      )}
      <Canvas ref={canvasRef} tool={tool} color={color} socket={socket} user={{ ...user, roomId }} isHost={isHost} />
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
      <div className="flex flex-col mx-2 my-2">
        <h3 className="font-bold">Chat:</h3>
        <div className="border p-2 my-2 h-64 overflow-y-scroll">
          {messages.map((msg, index) => (
            <div key={index} className="border p-2 my-1">
              <strong>{msg.user}: </strong>
              {msg.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="flex">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className="border p-2 flex-grow" placeholder="Type your message..." />
          <button type="submit" className="border p-2 bg-blue-500 text-white">
            Send
          </button>
        </form>
      </div>
    </>
  );
}
