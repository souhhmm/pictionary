import { useState, useRef } from "react";
import Canvas from "./Canvas";

export default function RoomPage() {
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");

  return (
    <>
      <div className="flex mx-2 my-2">
        <label htmlFor="color">Color Picker</label>
        <input type="color" id="color" className="mx-2 border bg-white border-gray-200 p-1 cursor-pointer rounded-lg" value={color} onChange={(e) => setColor(e.target.value)} />
        <span className="mx-2 text-primary">(Users Online: 0)</span>
      </div>
      <div className="flex flex-col mx-2 my-2">
        <label htmlFor="pencil" className="flex items-center">
          <input type="radio" name="tool" id="pencil" checked={tool == "pencil"} value="pencil" className="mr-2" onChange={(e) => setTool(e.target.value)} />
          Pencil
        </label>
        <label className="flex items-center">
          <input type="radio" name="tool" id="line" checked={tool == "line"} value="line" className="mr-2" onChange={(e) => setTool(e.target.value)} />
          Line
        </label>
        <label className="flex items-center">
        <input type="radio" name="tool" id="eraser" checked={tool == "eraser"} value="eraser" className="mr-2" onChange={(e) => setTool(e.target.value)} />
          Eraser
        </label>
      </div>
      <Canvas tool={tool} color={color} />
    </>
  );
}
