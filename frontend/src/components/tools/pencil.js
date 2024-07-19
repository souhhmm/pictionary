import Paper from "paper";

export default function pencilDraw(color) {
  let myPath;

  Paper.view.onMouseDown = (event) => {
    myPath = new Paper.Path();
    myPath.strokeColor = color;
    myPath.strokeWidth = 3;
    myPath.strokeCap = "round";
    myPath.strokeJoin = "round";
  };

  Paper.view.onMouseDrag = (event) => {
    myPath.add(event.point);
    myPath.smooth();
  };

  Paper.view.draw();
}
