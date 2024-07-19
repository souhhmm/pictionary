import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
    <>
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Join Room</CardTitle>
            <p className="text-gray-500 text-sm mt-2">Enter your name and a valid room ID to join a game.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input radius="sm" type="text" label="Name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room-id">Room ID</Label>
              <div className="flex items-center">
                <Input type="text" value={roomId} placeholder="Enter a valid Room ID"style={{ fontFamily: "'Digital-7 Mono', sans-serif", letterSpacing: "0.1em" }} className="flex-grow" onChange={(e) => setRoomId(e.target.value)} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">
              Don't have a room ID?{" "}
              <Link to="/" className="text-blue-600 hover:underline">
                Create Room
              </Link>
            </span>
            <Button type="submit" className={`bg-blue-600 text-white ${!name || !roomId ? "cursor-not-allowed opacity-50" : "hover:bg-blue-700"}`} onClick={joinRoom} disabled={!name || !roomId}>
              Join
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
