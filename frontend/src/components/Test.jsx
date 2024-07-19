export default function Test() {
  return (
    <>
      <div className="flex mx-2 my-2">
        {isHost && showStartButton && users.length > 1 && (
          <button onClick={startRound} className="ml-2 border-2 w-32 bg-green-500 text-white">
            Start Round
          </button>
        )}
        <span className="mx-2 text-primary">(Users Online: {users.length})</span>
        {showTimer && <span className="mx-2 text-red-500">Time Left: {timeLeft}s</span>}
        <span className="mx-2 text-gray-500">
          Room ID: {roomId} Round: {currentRound}/3
        </span>
        <button className="ml-auto border-2 w-32" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
      {isHost && !showStartButton && randomWords.length > 0 && (
        <div className="flex mx-2 my-2">
          {randomWords.map((word, index) => (
            <button key={index} onClick={() => handleWordClick(word)} className="mx-2 border-2 p-2 bg-blue-500 text-white">
              {word}
            </button>
          ))}
        </div>
      )}
      {chosenWord && (
        <div className="flex mx-2 my-2">
          <span className="text-xl">Chosen Word: {isHost ? chosenWord : chosenWord.split("").map((char, index) => <span key={index}>{char === " " ? " " : "_ "}</span>)}</span>
        </div>
      )}
      {isHost && !showStartButton && (
        <div className="flex flex-col mx-2 my-2">
          <label htmlFor="color">Color Picker</label>
          <input type="color" id="color" className="mx-2 border bg-white border-gray-200 p-1 cursor-pointer rounded-lg" value={color} onChange={(e) => setColor(e.target.value)} />
          <label htmlFor="pencil" className="flex items-center">
            <input type="radio" name="tool" id="pencil" checked={tool === "pencil"} value="pencil" className="mr-2" onChange={(e) => setTool(e.target.value)} />
            Pencil
          </label>    
          <label className="flex items-center">
            <input type="radio" name="tool" id="line" checked={tool === "line"} value="line" className="mr-2" onChange={(e) => setTool(e.target.value)} />
            Line
          </label>
          <label className="flex items-center">
            <input type="radio" name="tool" id="eraser" checked={tool === "eraser"} value="eraser" className="mr-2" onChange={(e) => setTool(e.target.value)} />
            Eraser
          </label>
          <button className="ml-2 border-2 w-32" onClick={() => canvasRef.current.resetCanvas()}>
            Clear Canvas
          </button>
        </div>
      )}
      <Canvas ref={canvasRef} tool={tool} color={color} socket={socket} user={{ ...user, roomId }} isHost={isHost} />
      <div className="flex flex-col mx-2 my-2">
        <h3 className="font-bold">Users in Room:</h3>
        {users.map((user) => (
          <div key={user.userId} className={`border p-2 my-2 ${user.host ? "bg-blue-100" : ""}`}>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>User ID:</strong> {user.userId}
            </p>
            <p>
              <strong>Host:</strong> {user.host ? "Yes" : "No"}
            </p>
            <p>
              <strong>Score:</strong> {scores[user.userId] || 0}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-col mx-2 my-2">
        <h3 className="font-bold">Chat:</h3>
        <div className="border p-2 my-2 h-64 overflow-y-scroll">
          {messages.map((msg, index) => (
            <div key={index} className="border p-2 my-1" style={{ backgroundColor: msg.highlight ? "#a3e9a4" : "transparent" }}>
              <strong>{msg.user}: </strong>
              {msg.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="flex">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className={`border p-2 flex-grow ${(isHost && !showStartButton) || userGuessed ? "cursor-not-allowed" : ""}`} placeholder="Type your message..." disabled={(isHost && !showStartButton) || userGuessed} />
          <button type="submit" className={`border p-2 bg-blue-500 text-white ${(isHost && !showStartButton) || userGuessed ? "cursor-not-allowed opacity-50" : ""}`} disabled={(isHost && !showStartButton) || userGuessed}>
            Send
          </button>
        </form>
      </div>
    </>
  );
}
