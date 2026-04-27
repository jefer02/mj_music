import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { NotificationProvider } from "./context/NotificationContext";
import { App } from "./App";
import "./ui/styles/styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
);
