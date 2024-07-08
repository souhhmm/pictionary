import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateRoomForm({ socket, setUser }) {
  const [roomID, setRoomID] = useState("");
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const generateRoomID = () => {
    if (name != "") {
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      setRoomID(result);
      return result;
    } else {
      console.log("please enter your name");
    }
  };

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
    const roomData = {
      name,
      roomID,
      userId: generateRoomID(),
      host: true,
    };
    setUser(roomData);
    navigate(`/${roomID}`);
    socket.emit("userJoined", roomData);
  };

  return (
    <div className="mx-2 my-2">
      <label>Create Room</label>
      <div>
        <input type="text" className="mx-2 my-2 border-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}></input>
      </div>
      <div className="flex items-center">
        <input type="text" className="mx-2 border-2" placeholder="Generate Room ID" value={copied ? "Copied!" : roomID} onClick={copyToClipboard} readOnly></input>
        <button className="border-2 w-24" onClick={generateRoomID}>
          Generate
        </button>
      </div>
      <div className="my-2 text-center">
        <button type="submit" className="mx-2 my-2 border-2 w-32" onClick={createRoom}>
          Create
        </button>
      </div>
    </div>
  );
}
