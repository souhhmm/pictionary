import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";
import Paper from "paper";
import pencilDraw from "./tools/pencil";
import eraserDraw from "./tools/eraser";
import lineDraw from "./tools/line";

const Canvas = forwardRef(({ tool, color, socket, user, isHost }, ref) => { //forward ref to pass ref to parent component
  const canvasRef = useRef(null);
  const [canvasImage, setCanvasImage] = useState(null);

  useImperativeHandle(ref, () => ({
    resetCanvas() {
      Paper.project.clear();
      const context = canvasRef.current.getContext("2d");
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setCanvasImage(null);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    Paper.setup(canvas);

    const updateCanvasData = () => {
      const imageData = canvas.toDataURL();
      socket.emit("canvasData", { roomId: user.roomId, imageData });
    };

    if (isHost) {
      Paper.view.onFrame = updateCanvasData;
    } else {
      socket.on("canvasData", (data) => {
        setCanvasImage(data.imageData);
      });
    }

    return () => {
      Paper.view.onFrame = null;
      socket.off("canvasData");
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

  return <>{isHost ? <canvas ref={canvasRef} className="w-full h-full" /> : <img src={canvasImage} className="w-full h-full" />}</>;
});

export default Canvas;
