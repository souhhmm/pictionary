import Canvas from "./Canvas";

export default function RoomPage() {
  return (
    <>
      <div className="flex mx-2 my-2">
        <label htmlFor="colorPicker">Color Picker</label>
        <input type="color" id="colorPicker" className="mx-2 border bg-white border-gray-200 p-1 cursor-pointer rounded-lg" />
        <span className="mx-2 text-primary">(Users Online: 0)</span>
      </div>
      <div className="flex flex-col mx-2 my-2">
        <label className="flex items-center">
          <input type="radio" name="tool" value="pencil" className="mr-2" />
          Pencil
        </label>
        <label className="flex items-center">
          <input type="radio" name="tool" value="line" className="mr-2" />
          Line
        </label>
        <label className="flex items-center">
          <input type="radio" name="tool" value="line" className="mr-2" />
          Eraser
        </label>
      </div>
      <Canvas />
    </>
  );
}
