import { useState } from "react";
import CreateRoomForm from "./CreateRoomForm";
import JoinRoomForm from "./JoinRoomForm";

export default function HomePage({ socket, setUser }) {
  return (
    <>
      <div className="flex justify-center">
        <CreateRoomForm socket={socket} setUser={setUser} />
        <JoinRoomForm />
      </div>
    </>
  );
}
