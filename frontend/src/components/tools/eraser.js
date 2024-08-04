import Paper from "paper";

export default function eraserDraw() {
  const eraserSize = 50;

  // create an invisible eraser path for hit testing
  const eraserPath = new Paper.Path.Circle({
    center: [0, 0],
    radius: eraserSize / 2,
    fillColor: 'white',
    strokeColor: 'white',
  });
  eraserPath.remove(); 

  const hitOptions = {
    stroke: true,
    fill: true,
    tolerance: eraserSize / 2,
  };

  const erasePath = (path) => {
    // check for intersections and remove intersecting segments
    const intersections = path.getIntersections(eraserPath);
    intersections.forEach(intersection => {
      path.splitAt(intersection);
    });

    path.segments = path.segments.filter(segment => {
      return !eraserPath.bounds.contains(segment.point);
    });
    
    if (path.segments.length === 0) {
      path.remove();
    }
  };

  const onErase = (event) => {
    eraserPath.position = event.point;

    // get items that intersect with the eraser path
    const hitResults = Paper.project.hitTestAll(event.point, hitOptions);
    hitResults.forEach(hitResult => {
      if (hitResult.item) {
        erasePath(hitResult.item);
      }
    });
  };

  Paper.view.onMouseDown = onErase;
  Paper.view.onMouseDrag = onErase;
}
