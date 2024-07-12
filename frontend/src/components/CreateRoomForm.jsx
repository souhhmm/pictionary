import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateRoomForm({ socket, setUser, uid }) {
  const [name, setName] = useState("");
  const [roomID, setRoomID] = useState(uid());
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const copyToClipboard = () => {
    if (roomID) {
      navigator.clipboard.writeText(roomID);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  };

  const createRoom = (e) => {
    e.preventDefault();
    if (name && roomID) {
      const roomData = {
        name,
        roomID,
        userId: uid(),
        host: true,
      };
      setUser(roomData);
      navigate(`/${roomID}`);
    } else {
      console.log("Name and Room ID are required to create a room.");
    }
  };

  const generateNewId = () => {
    setRoomID(uid());
  };

  return (
    <div className="mx-2 my-2">
      <label>Create Room</label>
      <div>
        <input type="text" className="mx-2 my-2 border-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex items-center">
        <input type="text" className="mx-2 border-2" placeholder="Generate Room ID" value={copied ? "Copied!" : roomID} onClick={copyToClipboard} readOnly />
        <button className="border-2 w-24" onClick={generateNewId}>
          Generate
        </button>
      </div>
      <div className="my-2 text-center">
        <button type="submit" className={`mx-2 my-2 border-2 w-32 ${!name || !roomID ? "cursor-not-allowed" : ""}`} onClick={createRoom} disabled={!name || !roomID}>
          Create
        </button>
      </div>
    </div>
  );
}
