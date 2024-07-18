import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CreateRoomForm({ socket, setUser, uid }) {
  const [name, setName] = useState("");
  const [roomId, setroomId] = useState(uid());
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const copyToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  };

  const createRoom = (e) => {
    e.preventDefault();
    if (name && roomId) {
      const roomData = {
        name,
        roomId,
        userId: uid(),
        host: true,
      };
      setUser(roomData);
      navigate(`/${roomId}`);
    } else {
      console.log("Name and Room ID are required to create a room.");
    }
  };

  const generateNewId = () => {
    setroomId(uid());
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Create Room</CardTitle>
          <p className="text-gray-500 text-sm mt-2">Enter your name and generate a room ID to create a game.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input radius="sm" type="text" label="Name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="room-id">Room ID</Label>
            <div className="flex items-center">
              <Input isReadOnly type="text" value={copied ? "Copied!" : roomId} onClick={copyToClipboard} style={{ fontFamily: "'Digital-7 Mono', sans-serif", letterSpacing: "0.1em" }} className="flex-grow" />
              <Button variant="ghost" onClick={generateNewId} className="h-10 ml-2">
                <RefreshCwIcon className="w-5 h-5 mr-1" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">
            Have a room ID?{" "}
            <Link to="/join" className="text-blue-600 hover:underline" prefetch={false}>
              Join Room
            </Link>
          </span>
          <Button type="submit" className={`bg-blue-600 text-white ${!name || !roomId ? "cursor-not-allowed opacity-50" : "hover:bg-blue-700"}`} onClick={createRoom} disabled={!name || !roomId}>
            Create
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function RefreshCwIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
