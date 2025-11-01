// src/index.jsx (RESTORE THIS VERSION)

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/index.css";

// --- Import the Context Providers ---
import { AuthProvider } from "./contexts/AuthUserContext"; // Use AuthContext, not AuthUserContext
import { ThemeProvider } from "./contexts/ThemeContext";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>
);