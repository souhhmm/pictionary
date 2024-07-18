// import CreateRoomForm from "./CreateRoomForm";
// import JoinRoomForm from "./JoinRoomForm";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    // <div className="flex justify-center">
    //   <CreateRoomForm socket={socket} setUser={setUser} uid={uid} />
    //   <JoinRoomForm socket={socket} setUser={setUser} uid={uid} />
    // </div>
    <div className="flex flex-col items-center justify-center h-screen">
      <p>Welcome to the Homepage!</p>
      <div className="mt-4">
        <Link to="/create">
          <button className="btn btn-primary mx-2">Create Room</button>
        </Link>
        <Link to="/join">
          <button className="btn btn-secondary mx-2">Join Room</button>
        </Link>
      </div>
    </div>
  );
}
