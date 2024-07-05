import HomePage from "./components/HomePage";
import RoomPage from "./components/RoomPage";
import { Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />}></Route>
      <Route path="/:roomId" element={<RoomPage />}></Route>
    </Routes>
  );
}
