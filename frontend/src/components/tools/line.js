import Paper from "paper";

export default function lineDraw(color) {
  let myPath;

  Paper.view.onMouseDown = (event) => {
    // create a new path when the mouse is pressed down
    myPath = new Paper.Path();
    myPath.strokeColor = color;
    myPath.strokeWidth = 3;
    myPath.add(event.point); // add the starting point to the path
  };

  Paper.view.onMouseDrag = (event) => {
    if (myPath) {
      // remove the last point to update the line preview
      myPath.removeSegment(1);
      myPath.add(event.point); // add the current point to the path
    }
  };

  Paper.view.onMouseUp = (event) => {
    if (myPath) {
      myPath.add(event.point); // finalize the line with the end point
      myPath = null; // reset the path for the next line
    }
  };

  Paper.view.draw();
}
