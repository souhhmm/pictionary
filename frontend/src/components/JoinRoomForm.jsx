import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoomForm({ socket, setUser, uid }) {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const joinRoom = (e) => {
    e.preventDefault();
    if (name && roomId) {
      const roomData = {
        name,
        roomId,
        userId: uid(),
        host: false,
      };
      setUser(roomData);
      navigate(`/${roomId}`);
    } else {
      console.log("Name and Room ID are required to join a room.");
    }
  };

  return (
    <div className="mx-2 my-2">
      <label>Join Room</label>
      <div>
        <input type="text" className="mx-2 my-2 border-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <input type="text" className="mx-2 border-2" placeholder="Enter Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      </div>
      <div className="my-2 text-center">
        <button type="submit" className="mx-2 my-2 border-2 w-32" onClick={joinRoom}>
          Join
        </button>
      </div>
    </div>
  );
}
