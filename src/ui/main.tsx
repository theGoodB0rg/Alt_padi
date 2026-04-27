import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { findAlternatives } from "@ui/chromeApi";
import { SidePanel } from "@ui/SidePanel";
import "@ui/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
  <StrictMode>
    <SidePanel onFindAlternatives={findAlternatives} />
  </StrictMode>
);
