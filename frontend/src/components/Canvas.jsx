import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import Paper from "paper";

const Canvas = forwardRef(({ tool, color, socket, user, isHost }, ref) => { //forward ref to pass ref to parent component
  const canvasRef = useRef(null);
  const [canvasImage, setCanvasImage] = useState(null);
  const lastSyncTime = useRef(0);
  const drawingCommandsQueue = useRef([]);
  const isDrawing = useRef(false);
  const syncTimeoutRef = useRef(null);
  const currentStroke = useRef(null);

  // Optimized sync intervals for drawing commands
  const COMMAND_SYNC_INTERVAL = 16; // 60fps for smooth drawing
  const BATCH_SYNC_DELAY = 50; // Batch multiple commands together
  const FULL_SYNC_INTERVAL = 1000; // Periodic full sync for reliability

  useImperativeHandle(ref, () => ({
    resetCanvas() {
      Paper.project.clear();
      const context = canvasRef.current.getContext("2d");
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setCanvasImage(null);
      // Clear drawing command queue on reset
      drawingCommandsQueue.current = [];
      currentStroke.current = null;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    },
  }));

  // Send drawing commands instead of full canvas images
  const sendDrawingCommands = useCallback((commands) => {
    if (!isHost || !socket.connected || !commands.length) return;

    const now = Date.now();
    if (now - lastSyncTime.current < COMMAND_SYNC_INTERVAL) {
      // Queue commands if sending too frequently
      drawingCommandsQueue.current.push(...commands);
      return;
    }

    lastSyncTime.current = now;
    
    // Include queued commands
    const allCommands = [...drawingCommandsQueue.current, ...commands];
    drawingCommandsQueue.current = [];

    socket.emit("canvasDrawing", { 
      roomId: user.roomId, 
      drawingCommands: allCommands,
      timestamp: now
    });
  }, [isHost, socket, user.roomId]);

  // Batched sync for accumulated drawing commands
  const batchedCommandSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      if (drawingCommandsQueue.current.length > 0) {
        sendDrawingCommands([]);
      }
    }, BATCH_SYNC_DELAY);
  }, [sendDrawingCommands]);

  // Full canvas sync for initial state or major changes
  const fullCanvasSync = useCallback(() => {
    if (!isHost || !canvasRef.current || !socket.connected) return;
    
    const imageData = canvasRef.current.toDataURL('image/png', 0.8);
    socket.emit("canvasFullSync", { roomId: user.roomId, imageData });
  }, [isHost, socket, user.roomId]);

  // Convert Paper.js drawing events to command objects
  const createDrawingCommand = useCallback((type, data) => {
    return {
      type,
      data,
      timestamp: Date.now(),
      tool,
      color
    };
  }, [tool, color]);

  // Apply received drawing commands to canvas
  const applyDrawingCommands = useCallback((commands) => {
    commands.forEach(command => {
      const { type, data, tool: cmdTool, color: cmdColor } = command;
      
      switch (type) {
        case 'start':
          // Create new path
          const newPath = new Paper.Path();
          newPath.strokeColor = cmdColor;
          newPath.strokeWidth = 3;
          if (cmdTool === 'pencil') {
            newPath.strokeCap = "round";
            newPath.strokeJoin = "round";
          }
          newPath.add(new Paper.Point(data.point.x, data.point.y));
          newPath.commandId = data.commandId;
          break;
          
        case 'continue':
          // Add point to existing path
          const existingPath = Paper.project.activeLayer.children.find(
            item => item.commandId === data.commandId
          );
          if (existingPath) {
            existingPath.add(new Paper.Point(data.point.x, data.point.y));
            if (cmdTool === 'pencil') {
              existingPath.smooth();
            }
          }
          break;
          
        case 'end':
          // Finalize path
          const finalPath = Paper.project.activeLayer.children.find(
            item => item.commandId === data.commandId
          );
          if (finalPath && data.point) {
            finalPath.add(new Paper.Point(data.point.x, data.point.y));
          }
          break;
          
        case 'erase':
          // Handle eraser commands
          const erasePoint = new Paper.Point(data.point.x, data.point.y);
          const hitResults = Paper.project.hitTestAll(erasePoint, {
            stroke: true,
            fill: true,
            tolerance: 25
          });
          hitResults.forEach(hitResult => {
            if (hitResult.item) {
              hitResult.item.remove();
            }
          });
          break;
      }
    });
    Paper.view.draw();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    Paper.setup(canvas);

    if (!isHost) {
      // Listen for optimized drawing commands
      socket.on("canvasDrawing", (data) => {
        const { drawingCommands } = data;
        if (drawingCommands && drawingCommands.length > 0) {
          applyDrawingCommands(drawingCommands);
        }
      });

      // Listen for full canvas sync as fallback
      socket.on("canvasFullSync", (data) => {
        setCanvasImage(data.imageData);
      });
    }

    // Listen for reset canvas events from server
    socket.on("resetCanvas", () => {
      Paper.project.clear();
      if (canvasRef.current) {
        const context = canvasRef.current.getContext("2d");
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setCanvasImage(null);
      // Clear drawing command queue on reset
      drawingCommandsQueue.current = [];
      currentStroke.current = null;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    });

    // Periodic full sync for reliability
    const fullSyncInterval = setInterval(() => {
      if (isHost) {
        fullCanvasSync();
      }
    }, FULL_SYNC_INTERVAL);

    return () => {
      Paper.view.onFrame = null;
      socket.off("canvasDrawing");
      socket.off("canvasFullSync");
      socket.off("resetCanvas");
      clearInterval(fullSyncInterval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isHost, socket, user.roomId, applyDrawingCommands, fullCanvasSync]);

  // Optimized effect for tool setup with drawing command sync
  useEffect(() => {
    if (!isHost) return;

    // Generate unique command ID for each stroke
    const generateCommandId = () => `${Date.now()}_${Math.random()}`;

    // Enhanced tool functions that emit drawing commands
    const setupPencilTool = (color) => {
      let myPath;
      let commandId;

      Paper.view.onMouseDown = (event) => {
        commandId = generateCommandId();
        currentStroke.current = commandId;
        
        myPath = new Paper.Path();
        myPath.strokeColor = color;
        myPath.strokeWidth = 3;
        myPath.strokeCap = "round";
        myPath.strokeJoin = "round";
        myPath.add(event.point);
        myPath.commandId = commandId;

        // Send start command
        const command = createDrawingCommand('start', {
          point: { x: event.point.x, y: event.point.y },
          commandId
        });
        sendDrawingCommands([command]);
        isDrawing.current = true;
      };

      Paper.view.onMouseDrag = (event) => {
        if (myPath) {
          myPath.add(event.point);
          myPath.smooth();

          // Send continue command
          const command = createDrawingCommand('continue', {
            point: { x: event.point.x, y: event.point.y },
            commandId
          });
          drawingCommandsQueue.current.push(command);
          batchedCommandSync();
        }
      };

      Paper.view.onMouseUp = (event) => {
        if (myPath) {
          // Send end command
          const command = createDrawingCommand('end', {
            point: event ? { x: event.point.x, y: event.point.y } : null,
            commandId
          });
          sendDrawingCommands([command]);
          isDrawing.current = false;
          currentStroke.current = null;
          myPath = null;
        }
      };
      Paper.view.draw();
    };

    const setupLineTool = (color) => {
      let myPath;
      let commandId;

      Paper.view.onMouseDown = (event) => {
        commandId = generateCommandId();
        currentStroke.current = commandId;
        
        myPath = new Paper.Path();
        myPath.strokeColor = color;
        myPath.strokeWidth = 3;
        myPath.add(event.point);
        myPath.commandId = commandId;

        const command = createDrawingCommand('start', {
          point: { x: event.point.x, y: event.point.y },
          commandId
        });
        sendDrawingCommands([command]);
        isDrawing.current = true;
      };

      Paper.view.onMouseDrag = (event) => {
        if (myPath) {
          if (myPath.segments.length > 1) {
            myPath.removeSegment(1);
          }
          myPath.add(event.point);

          const command = createDrawingCommand('continue', {
            point: { x: event.point.x, y: event.point.y },
            commandId
          });
          drawingCommandsQueue.current.push(command);
          batchedCommandSync();
        }
      };

      Paper.view.onMouseUp = (event) => {
        if (myPath) {
          if (myPath.segments.length > 1) {
            myPath.removeSegment(myPath.segments.length - 1);
          }
          myPath.add(event.point);

          const command = createDrawingCommand('end', {
            point: { x: event.point.x, y: event.point.y },
            commandId
          });
          sendDrawingCommands([command]);
          isDrawing.current = false;
          currentStroke.current = null;
          myPath = null;
        }
      };
      Paper.view.draw();
    };

    const setupEraserTool = () => {
      const onErase = (event) => {
        const hitResults = Paper.project.hitTestAll(event.point, {
          stroke: true,
          fill: true,
          tolerance: 25
        });
        
        hitResults.forEach(hitResult => {
          if (hitResult.item) {
            hitResult.item.remove();
          }
        });

        // Send erase command
        const command = createDrawingCommand('erase', {
          point: { x: event.point.x, y: event.point.y }
        });
        sendDrawingCommands([command]);
      };

      Paper.view.onMouseDown = onErase;
      Paper.view.onMouseDrag = onErase;
      Paper.view.onMouseUp = () => {};
    };

    // Set up the appropriate tool
    if (tool === "pencil") {
      setupPencilTool(color);
    } else if (tool === "eraser") {
      setupEraserTool();
    } else if (tool === "line") {
      setupLineTool(color);
    }

    // Send full sync when tool changes for reliability
    fullCanvasSync();

  }, [color, tool, isHost, sendDrawingCommands, batchedCommandSync, createDrawingCommand, fullCanvasSync]);

  return <>{isHost ? <canvas ref={canvasRef} className="w-full h-full" /> : <img src={canvasImage} className="w-full h-full" />}</>;
});

export default Canvas;
