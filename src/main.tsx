import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Connection } from "@data";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Connection>
      <App />
    </Connection>
  </StrictMode>,
);
