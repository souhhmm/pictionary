import { useRef, useEffect, useState } from "react";
import Paper from "paper";
import pencilDraw from "./tools/pencil";
import eraserDraw from "./tools/eraser";
import lineDraw from "./tools/line";

export default function Canvas({ tool, color, socket, user }) {
  const canvasRef = useRef(null);
  const [isHost, setIsHost] = useState(user.host);
  const [canvasImage, setCanvasImage] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    Paper.setup(canvas);

    if (isHost) {
      Paper.view.onFrame = () => {
        const imageData = canvas.toDataURL();
        socket.emit("canvasData", { roomId: user.roomId, imageData });
      };
    } else {
      socket.on("canvasData", (data) => {
        setCanvasImage(data.imageData);
      });
    }

    return () => {
      Paper.view.onFrame = null;
    };
  }, [isHost, socket, user.roomId]);

  useEffect(() => {
    if (isHost) {
      if (tool === "pencil") {
        pencilDraw(color);
      } else if (tool === "eraser") {
        eraserDraw();
      } else if (tool === "line") {
        lineDraw(color);
      }
    }
  }, [color, tool, isHost]);

  return <div className="flex justify-center mx-2 my-2">{isHost ? <canvas ref={canvasRef} width={800} height={400} className="border border-gray-300" /> : <img src={canvasImage} alt="Canvas" width={800} height={400} className="border border-gray-300" />}</div>;
}
