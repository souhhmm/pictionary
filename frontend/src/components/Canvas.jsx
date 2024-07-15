import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";
import Paper from "paper";
import pencilDraw from "./tools/pencil";
import eraserDraw from "./tools/eraser";
import lineDraw from "./tools/line";

const Canvas = forwardRef(({ tool, color, socket, user, isHost }, ref) => {
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

  return <div className="flex justify-center mx-2 my-2">{isHost ? <canvas ref={canvasRef} width={800} height={400} className="border border-gray-300" /> : <img src={canvasImage} alt="Canvas" width={800} height={400} className="border border-gray-300" />}</div>;
});

export default Canvas;
