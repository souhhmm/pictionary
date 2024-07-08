export default function JoinRoomForm() {
  return (
    <div className="mx-2 my-2">
      <label>Join Room</label>
      <div>
        <input type="text" className="mx-2 my-2 border-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}></input>
      </div>
      <div>
        <input type="text" className="mx-2 border-2" placeholder="Enter Room ID"></input>
      </div>
      <div className="my-2 text-center">
        <button type="button" className="mx-2 my-2 border-2 w-32">
          Join
        </button>
      </div>
    </div>
  );
}
