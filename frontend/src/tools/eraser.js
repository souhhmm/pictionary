import Paper from "paper";

export default function eraserDraw() {
  let hitOptions = {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5,
  };

  Paper.view.onMouseDown = (event) => {
    let hitResult = Paper.project.hitTest(event.point, hitOptions);
    if (hitResult) {
      hitResult.item.remove();
    }
  };
}
