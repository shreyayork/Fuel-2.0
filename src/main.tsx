import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Fuel render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          alignItems: "center",
          background: "#f7f8fa",
          color: "#1a2332",
          display: "flex",
          fontFamily: "Inter, system-ui, sans-serif",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 24,
        }}
        >
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Fuel failed to load</h1>
            <p style={{ margin: 0, color: "#b42318" }}>{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

createRoot(rootEl).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
