import { CobroData } from "@/data/cobro";
import CobroViewer from "@/pages/Cobros";
import HomePage from "@/pages/HomePage";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

const AppRouter = () => (
  <HomePage>
    <Routes>
      <Route path="/" element={<CobroViewer/>} />
    </Routes>
  </HomePage>
);

export default AppRouter;
