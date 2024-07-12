import CreateRoomForm from "./CreateRoomForm";
import JoinRoomForm from "./JoinRoomForm";

export default function HomePage({ socket, setUser, uid }) {
  return (
    <div className="flex justify-center">
      <CreateRoomForm socket={socket} setUser={setUser} uid={uid} />
      <JoinRoomForm socket={socket} setUser={setUser} uid={uid} />
    </div>
  );
}
