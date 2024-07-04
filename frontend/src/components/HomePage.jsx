import { useState } from 'react';

export default function HomePage() {
  const [roomID, setRoomID] = useState('');

  const generateRoomID = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setRoomID(result);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomID);
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
            <input type="text" className="mx-2 border-2" placeholder="Room ID"></input>
          </div>
        </div>
        <div className="mx-2 my-2">
          <label>Create Room</label>
          <div>
            <input type="text" className="mx-2 my-2 border-2 " placeholder="Name"></input>
          </div>
          <div>
            <input type="text" className="mx-2 border-2" placeholder="Generate Room ID" 
            value={roomID} onClick={copyToClipboard} readOnly></input>
            <button className="border-2" onClick={generateRoomID}>Generate</button>
          </div>
        </div>
      </div>

    </>
  );
}
