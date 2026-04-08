import { CobroData } from "@/data/cobro";
import CobroViewer from "@/pages/Cobros";
import HomePage from "@/pages/HomePage";
import RenderFechas from "@/components/Fechas/RenderFechas";
import VerificarNota from "@/pages/Academico/VerificarNota";
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
      <Route path="/administrativo" element={<RenderFechas />} />
      <Route path="/academico/verificar-nota" element={<VerificarNota />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </HomePage>
);

export default AppRouter;
