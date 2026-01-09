import React from "react";
import BaseModal from "./BaseModal";

export default function PinPromptModal({
  isOpen,
  selectedUserId,
  userPins,
  pinInput,
  setPinInput,
  pinError,
  setPinError,
  onVerify,
  onCancel,
}) {
  const isNewPin = !userPins[selectedUserId];

  const handleKeyPress = (e) => {
    if (e.key === "Enter") onVerify();
  };

  const handleInputChange = (e) => {
    setPinInput(e.target.value);
    setPinError("");
  };

  return (
    <BaseModal isOpen={isOpen}>
      <h3
        className="christmas-font"
        style={{
          fontSize: "1.5rem",
          marginBottom: "1rem",
          color: "#0a4d3c",
          textAlign: "center",
        }}
      >
        {isNewPin ? "Create Your PIN" : "Enter Your PIN"}
      </h3>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "#374151",
          textAlign: "center",
        }}
      >
        {isNewPin
          ? "Set a PIN to protect your message (minimum 4 characters)"
          : "Enter your PIN to access your message"}
      </p>
      <input
        type="password"
        value={pinInput}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={isNewPin ? "Create PIN (min 4 chars)" : "Enter PIN"}
        className="input"
        style={{ marginBottom: "0.5rem" }}
        autoFocus
      />
      {pinError && (
        <p
          style={{
            color: "#dc2626",
            fontSize: "0.875rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          {pinError}
        </p>
      )}
      <div className="flex gap-3" style={{ marginTop: "1rem" }}>
        <button
          onClick={onVerify}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          {isNewPin ? "Set PIN" : "Verify"}
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </BaseModal>
  );
}
