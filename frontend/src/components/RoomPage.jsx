import React, { useState, useEffect, useRef } from "react";
import Canvas from "./Canvas";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
// import { Textarea } from "@/components/ui/textarea";
// import { Toggle } from "@/components/ui/toggle";
// import { Separator } from "@/components/ui/separator";
// import { ScrollArea } from "@/components/ui/scroll-area";

const ROUND_TIME = 60;

export default function RoomPage({ socket, user }) {
  const { roomId } = useParams();
  const [tool, setTool] = useState("");
  const [color, setColor] = useState("#000000");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const endOfMessagesRef = useRef(null);
  const [isHost, setIsHost] = useState(user.host);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [showStartButton, setShowStartButton] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const [randomWords, setRandomWords] = useState([]);
  const [chosenWord, setChosenWord] = useState("");
  const [userGuessed, setUserGuessed] = useState(false);
  const [scores, setScores] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const roomData = {
      name: user.name,
      userId: user.userId,
      roomId,
      host: user.host,
    };
    socket.emit("userJoined", roomData);
    initializeScores(users);

    socket.on("updateUsersOnline", (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on("receiveMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("hostChanged", (newHost) => {
      setIsHost(newHost.userId === user.userId);
      resetRound();
      alert(`Host changed to ${newHost.name}`);
    });

    socket.on("timerUpdate", (remainingTime) => {
      setTimeLeft(remainingTime);
    });

    socket.on("startTimer", () => {
      setShowTimer(true);
    });

    socket.on("stopTimer", () => {
      setShowTimer(false);
    });

    socket.on("randomWords", (words) => {
      setRandomWords(words);
    });

    socket.on("chosenWord", (word) => {
      setChosenWord(word);
      setUserGuessed(false);
    });

    socket.on("correctGuess", (guesserId) => {
      if (guesserId === user.userId) {
        setUserGuessed(true);
        // updateScore(user.userId, 10);
      }
    });

    socket.on("updateScores", (updatedScores) => {
      const newScores = {};
      updatedScores.forEach(({ userId, score }) => {
        newScores[userId] = score;
      });
      setScores(newScores);
    });

    socket.on("roundUpdate", (round) => {
      setCurrentRound(round);
    });

    return () => {
      socket.emit("leaveRoom", roomId);
      socket.off("roundUpdate");
      socket.disconnect();
    };
  }, [roomId, socket, user]);

  const initializeScores = (users) => {
    const initialScores = {};
    users.forEach((user) => {
      initialScores[user.userId] = scores[user.userId] || 0;
    });
    setScores((prevScores) => ({
      ...prevScores,
      ...initialScores,
    }));
  };

  // const updateScore = (userId, points) => {
  //   setScores((prevScores) => ({
  //     ...prevScores,
  //     [userId]: (prevScores[userId] || 0) + points,
  //   }));
  // };

  const resetRound = () => {
    clearInterval(timerRef.current);
    setTimeLeft(ROUND_TIME);
    canvasRef.current.resetCanvas();
    setTool("pencil");
    setColor("#000000");
    setShowTimer(false);
    setShowStartButton(true);
    setRandomWords([]);
    setChosenWord("");
    setUserGuessed(false);
  };

  const startRound = () => {
    socket.emit("startRound", roomId);
    setShowStartButton(false);
  };

  const handleLeaveRoom = () => {
    socket.emit("leaveRoom", roomId);
    navigate("/");
  };

  const handleToolChange = (value) => {
    setTool(value);
  };

  const handleColorChange = (event) => {
    setColor(event.target.value);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const isCorrectGuess = message.trim().toLowerCase() === chosenWord.trim().toLowerCase();
    if (isCorrectGuess) {
      setUserGuessed(true);
      socket.emit("correctGuess", { roomId, userId: user.userId });
      const newMessage = {
        user: user.name,
        text: "Correctly guessed!",
        roomId,
        highlight: isCorrectGuess,
      };
      socket.emit("sendMessage", newMessage);
    } else {
      const newMessage = {
        user: user.name,
        text: isCorrectGuess ? "Correctly guessed!" : message,
        roomId,
        highlight: isCorrectGuess,
      };
      socket.emit("sendMessage", newMessage);
    }
    setMessage("");
  };

  const handleWordClick = (word) => {
    setChosenWord(word);
    setRandomWords([]);
    socket.emit("wordChosen", { roomId, word });
  };

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="grid grid-cols-[300px_1fr_300px] h-screen w-full bg-background">
      {/* Users Sidebar */}
      <div className="flex flex-col gap-4 p-4 bg-card text-card-foreground h-full">
        {/* Users List */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            <span className="font-medium">Players</span>
          </div>
          <span className="text-gray-500 text-sm">{users.length} Online</span>
        </div>
        <div className="flex flex-col gap-2 overflow-auto flex-1">
          {users.map((user) => (
            <div key={user.userId} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border">
                  <AvatarImage src="frontend/src/components/placeholder-user.jpg" />
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.host ? "Drawing" : "Guessing"}</div>
                </div>
              </div>
              <Badge variant="outline">Score: {scores[user.userId] || 0}</Badge>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 bg-blue-600 px-3 py-2 rounded-md mt-auto cursor-pointer hover:bg-blue-700" onClick={handleLeaveRoom}>
          <span className="text-white">Leave Room</span>
          <LogOutIcon className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Drawing Canvas and Controls */}
      <div className="flex flex-col items-center justify-center bg-gray-100">
        <div className="relative w-[calc(100%-40px)] max-w-[800px] h-[500px] bg-white border rounded-lg overflow-hidden mx-4">
          <Canvas ref={canvasRef} tool={tool} color={color} socket={socket} user={{ ...user, roomId }} isHost={isHost} />
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 px-3 py-1 rounded-md">
            <div style={{ fontFamily: "'Digital-7 Mono', sans-serif", letterSpacing: "0.1em" }} className="text-gray-400">
              {roomId}
            </div>
            {/* <div style={{ fontFamily: "'Digital-7 Mono', sans-serif", letterSpacing: "0.1em" }} className="text-gray-400">{roomId}</div> */}
          </div>
          {showTimer && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/80 px-3 py-1 rounded-md">
              <div className="font-medium">Timer:</div>
              <div>{timeLeft}s</div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 px-3 py-1 rounded-md">
            <div className="font-medium">Round:</div>
            <div>{currentRound}/3</div>
          </div>
        </div>
        {isHost && !showStartButton && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button variant="ghost" size="icon" onClick={() => document.getElementById("color-picker").click()}>
              <PaletteIcon className="w-5 h-5" style={{ color: color }} />
              <span className="sr-only">Color Picker</span>
            </Button>
            <input id="color-picker" type="color" value={color} onChange={handleColorChange} className="absolute opacity-0 w-0 h-0" />
            <ToggleGroup type="single" defaultValue="pencil" aria-label="Tool selection" value={tool} onValueChange={handleToolChange}>
              <ToggleGroupItem value="pencil" style={{ backgroundColor: tool === "pencil" ? "#3b82f6" : "#e5e7eb  ", color: tool === "pencil" ? "#ffffff" : "#2563eb" }} className="flex items-center justify-center p-2 rounded-md transition-colors">
                <PencilIcon className="w-5 h-5" style={{ color: tool === "pencil" ? "#ffffff" : "#2563eb" }} />
                <span className="sr-only">Pencil tool</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="line" style={{ backgroundColor: tool === "line" ? "#3b82f6" : "#e5e7eb", color: tool === "line" ? "#ffffff" : "#2563eb" }} className="flex items-center justify-center p-2 rounded-md transition-colors">
                <PenLineIcon className="w-5 h-5" style={{ color: tool === "line" ? "#ffffff" : "#2563eb" }} />
                <span className="sr-only">Line tool</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="eraser" style={{ backgroundColor: tool === "eraser" ? "#3b82f6" : "#e5e7eb", color: tool === "eraser" ? "#ffffff" : "#2563eb" }} className="flex items-center justify-center p-2 rounded-md transition-colors">
                <EraserIcon className="w-5 h-5" style={{ color: tool === "eraser" ? "#ffffff" : "#2563eb" }} />
                <span className="sr-only">Eraser tool</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="ghost" size="icon" onClick={() => canvasRef.current.resetCanvas()}>
              <TrashIcon className="w-5 h-5" />
              <span className="sr-only">Clear canvas</span>
            </Button>
          </div>
        )}
        {isHost && showStartButton && users.length > 1 && (
          <Button className="mt-4 bg-blue-600 text-white" onClick={startRound}>
            Start Round
          </Button>
        )}
        {isHost && !showStartButton && randomWords.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            {randomWords.map((word, index) => (
              <Button key={index} onClick={() => handleWordClick(word)} variant="outline">
                {word}
              </Button>
            ))}
          </div>
        )}
        {chosenWord && (
          <div className="mt-4 text-lg bg-white rounded-md p-3 w-1/2 font-medium flex justify-center items-center">
            <span className="font-medium tracking-widest">{isHost ? chosenWord : chosenWord.split("").map((char, index) => <span key={index}>{char === " " ? " " : "_ "}</span>)}</span>
          </div>
        )}
      </div>

      {/* Chatbox Sidebar */}
      <div className="flex flex-col gap-4 p-4 bg-card text-card-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareIcon className="w-5 h-5" />
            <span className="font-medium">Chat</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-175px)]">
            {/* Chat Messages */}
            {messages.map((msg, index) => (
              <div className="flex items-start gap-3 mb-4" key={index}>
                <Avatar className="w-8 h-8 border">
                  <AvatarImage src="frontend/src/components/placeholder-user.jpg" />
                  <AvatarFallback>{msg.user.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`flex-1 rounded-md px-2 py-1 ${msg.highlight ? "bg-green-200" : "bg-transparent"}`}>
                  <div className="font-medium">{msg.user}</div>
                  <div className={`text-base ${msg.highlight ? "font-bold text-green-600" : ""}`}>{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>
          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="relative mt-auto mb-1 flex items-center">
            <Input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." className={`flex-1 min-h-[48px] rounded-lg bg-gray-100 resize-none p-4 border border-neutral-200 pr-16 ${(isHost && !showStartButton) || userGuessed ? "cursor-not-allowed opacity-50" : ""}`} disabled={(isHost && !showStartButton) || userGuessed} />
            <Button variant="ghost" type="submit" size="icon" className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${(isHost && !showStartButton) || userGuessed || !message.trim() ? "cursor-not-allowed opacity-50" : ""} bg-blue-600`} disabled={(isHost && !showStartButton) || userGuessed || !message.trim()}>
              <SendIcon className="w-4 h-4 text-white" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EraserIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

function LogOutIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function MessageSquareIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PenLineIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PencilIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PaletteIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function SendIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
