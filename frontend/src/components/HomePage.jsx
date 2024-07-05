import { useState } from "react";

export default function HomePage() {
  const [roomID, setRoomID] = useState("");
  const [copied, setCopied] = useState(false);

  const generateRoomID = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    } 
    setRoomID(result);
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

  return (
    <>
      <div className="flex justify-center">
        <div className="mx-2 my-2">
          <label>Join Room</label>
          <div>
            <input type="text" className="mx-2 my-2 border-2" placeholder="Name"></input>
          </div>
          <div>
            <input type="text" className="mx-2 border-2" placeholder="Enter Room ID"></input>
          </div>
          <div className="my-2 text-center">
            <button type="button" className="mx-2 my-2 border-2 w-32">Join</button>
          </div>
        </div>
        <div className="mx-2 my-2">
          <label>Create Room</label>
          <div>
            <input type="text" className="mx-2 my-2 border-2" placeholder="Name"></input>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              className="mx-2 border-2"
              placeholder="Generate Room ID"
              value={copied ? "Copied!" : roomID}
              onClick={copyToClipboard}
              readOnly
            ></input>
            <button className="border-2 w-24" onClick={generateRoomID}>
              Generate
            </button> 
          </div>
          <div className="my-2 text-center">
            <button type="button" className="mx-2 my-2 border-2 w-32">Create</button>
          </div>
        </div>
      </div>
    </>
  );
}
