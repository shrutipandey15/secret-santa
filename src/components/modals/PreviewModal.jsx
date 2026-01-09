import React from "react";
import BaseModal from "./BaseModal";

export default function PreviewModal({
  isOpen,
  receiverName,
  message,
  getRandomFallback,
  onClose,
}) {
  return (
    <BaseModal isOpen={isOpen} maxWidth="700px">
      <h3
        className="christmas-font"
        style={{
          fontSize: "2rem",
          marginBottom: "1rem",
          color: "#0a4d3c",
          textAlign: "center",
        }}
      >
        Preview
      </h3>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        This is how your message will look during the reveal
      </p>

      <div className="reveal-header fade-in-up" style={{ marginBottom: "2rem" }}>
        <h2 className="reveal-header-title christmas-font">
          A message written for
        </h2>
        <p className="reveal-header-name christmas-font glow-text">
          {receiverName}
        </p>
      </div>

      <div className="message-box">
        <p className="message-text">
          {message || getRandomFallback()}
          {!message && (
            <span
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginTop: "1rem",
                fontStyle: "italic",
                opacity: 0.7,
              }}
            >
              (The Secret Santa was too shy to write a message, so the elves
              wrote this one!)
            </span>
          )}
        </p>
      </div>

      <button
        onClick={onClose}
        className="btn btn-primary"
        style={{ width: "100%", marginTop: "1.5rem" }}
      >
        Close Preview
      </button>
    </BaseModal>
  );
}
