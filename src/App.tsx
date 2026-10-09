import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./ui/Layout";
import Home from "./pages/Home";
import Heating from "./pages/Heating";
import Shutters from "./pages/Shutters";
import Climate from "./pages/Climate";
import Prayers from "./pages/Prayers";

// HashRouter : fonctionne tel quel depuis /local/dashboard/index.html, sans configuration serveur.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="chauffage" element={<Heating />} />
          <Route path="volets" element={<Shutters />} />
          <Route path="climat" element={<Climate />} />
          <Route path="prieres" element={<Prayers />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
