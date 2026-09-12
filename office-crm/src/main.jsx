import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div dir="rtl" style={{ fontFamily: "sans-serif", padding: 24, background: "#F6F2E9", minHeight: "100vh", color: "#1B2A45" }}>
          <h2>خطایی رخ داد</h2>
          <p style={{ color: "#A8402F" }}>{String(this.state.error?.message || this.state.error)}</p>
          <p style={{ fontSize: 13, opacity: 0.8 }}>لطفاً این پیام را برای بررسی ارسال کنید.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
