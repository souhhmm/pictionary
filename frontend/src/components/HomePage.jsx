// homepage.jsx
import CreateRoomForm from "./CreateRoomForm";
import JoinRoomForm from "./JoinRoomForm";

export default function HomePage({ socket, setUser, setRoomID, uid }) {
  return (
    <div className="flex justify-center">
      <CreateRoomForm socket={socket} setUser={setUser} setRoomID={setRoomID} uid={uid} />
      <JoinRoomForm socket={socket} setUser={setUser} setRoomID={setRoomID} uid={uid} />
    </div>
  );
}
