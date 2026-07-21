/**
 * Application entry point.
 * Mounts the React tree into the #root div defined in index.html.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Fail fast with a clear message rather than a cryptic null-deref if the
// template HTML is ever misconfigured and the #root element is missing.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Root mount point #root not found in index.html. " +
    "Ensure <div id=\"root\"></div> exists in the page template."
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
