import React from "react";

export default function BaseModal({ isOpen, children, maxWidth = "400px" }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div className="card" style={{ maxWidth, width: "100%", padding: "2rem" }}>
        {children}
      </div>
    </div>
  );
}
