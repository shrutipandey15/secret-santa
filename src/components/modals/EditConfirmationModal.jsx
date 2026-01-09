import React from "react";
import BaseModal from "./BaseModal";

export default function EditConfirmationModal({
  isOpen,
  isUpdate,
  onDone,
  onKeepEditing,
}) {
  return (
    <BaseModal isOpen={isOpen} maxWidth="500px">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}></div>
      <h3
        className="christmas-font"
        style={{
          fontSize: "2rem",
          marginBottom: "1rem",
          color: "#0a4d3c",
          textAlign: "center",
        }}
      >
        {isUpdate ? "Message Updated!" : "Message Saved!"}
      </h3>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "#374151",
          textAlign: "center",
          fontSize: "1.125rem",
        }}
      >
        Your secret is safe. You can edit your message anytime before the
        reveal starts.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
        <button
          onClick={onDone}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          Done
        </button>
        <button
          onClick={onKeepEditing}
          className="btn btn-secondary"
          style={{ width: "100%" }}
        >
          Keep Editing
        </button>
      </div>
    </BaseModal>
  );
}
