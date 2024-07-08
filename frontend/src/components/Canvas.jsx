import { useRef, useEffect } from "react";
import Paper from "paper";
import pencilDraw from "./tools/pencil";
import eraserDraw from "./tools/eraser";
import lineDraw from "./tools/line";

export default function Canvas({ tool, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    Paper.setup(canvas);
  }, []);

  useEffect(() => {
    if (tool === "pencil") {
      pencilDraw(color);
    } else if (tool == "eraser") {
      eraserDraw();
    } else if (tool == "line") {
      lineDraw(color);
    }
  }, [color, tool]);

  return (
    <>
      <div className="flex justify-center mx-2 my-2">
        <canvas ref={canvasRef} width={800} height={400} className="border border-gray-300" />
      </div>
    </>
  );
}
