import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@blueprintjs/core/lib/css/blueprint.css";
import '@blueprintjs/select/lib/css/blueprint-select.css';
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./styles/globals.css";
import "./styles/map-overlays.css";

createRoot(document.getElementById("root")!).render(<App />);