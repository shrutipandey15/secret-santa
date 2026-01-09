import React, { useState, useEffect, useRef } from "react";
export default function WritingPhase({
  isAdmin,
  assignments,
  participants,
  onReturnToSetup,
  currentUser,
  onUserSelect,
  onStartReveal,
  userAssignment,
  onSaveMessage,
  onShowPreview,
  onShowEditConfirmation,
  onBack,
}) {
  const completedCount = assignments.filter((a) => a.messageSubmitted).length;
  const incompleteCount = assignments.length - completedCount;

  const [localMessage, setLocalMessage] = useState("");
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (userAssignment) {
      setLocalMessage(userAssignment.message || "");
    }
  }, [userAssignment?.assignmentId]);

  const handleMessageChange = (e) => {
    const newValue = e.target.value;
    setLocalMessage(newValue);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSaveMessage(userAssignment.assignmentId, newValue);
    }, 500);
  };

  return (
    <div>
      {isAdmin && (
        <div className="card fade-in-up" style={{ marginBottom: "2rem" }}>
          <h2
            className="christmas-font"
            style={{
              fontSize: "2rem",
              marginBottom: "1.5rem",
              color: "#0a4d3c",
            }}
          >
            Writing Progress
          </h2>

          <div
            style={{
              padding: "1.5rem",
              background: "linear-gradient(135deg, #fef2f2, #f0fdf4)",
              borderRadius: "1rem",
              border: "3px solid #ffd700",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#c41e3a",
                textAlign: "center",
                marginBottom: "0.5rem",
              }}
            >
              {completedCount} / {assignments.length}
            </div>
            <div
              style={{
                fontSize: "1rem",
                color: "#6b7280",
                textAlign: "center",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Messages Written
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {assignments.map((assignment) => (
              <div
                key={assignment.assignmentId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem",
                  background: assignment.messageSubmitted
                    ? "linear-gradient(to right, #f0fdf4, #d1fae5)"
                    : "linear-gradient(to right, #fef2f2, #fee2e2)",
                  borderRadius: "0.75rem",
                  border: assignment.messageSubmitted
                    ? "2px solid #10b981"
                    : "2px solid #ef4444",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>
                    {assignment.messageSubmitted ? "✅" : "⏳"}
                  </span>
                  <div>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: "#0a4d3c",
                        fontSize: "1.125rem",
                      }}
                    >
                      {assignment.santaName}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "1rem" }}>
                      {" "}
                      →{" "}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#374151",
                        fontSize: "1rem",
                      }}
                    >
                      {assignment.receiverName}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: assignment.messageSubmitted ? "#059669" : "#dc2626",
                  }}
                >
                  {assignment.messageSubmitted ? "Submitted" : "Pending"}
                </span>
              </div>
            ))}
          </div>

          {incompleteCount > 0 && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "#fef3c7",
                borderRadius: "0.75rem",
                border: "2px solid #f59e0b",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#92400e",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {incompleteCount} person(s) haven't written yet. You can still
                start the reveal, but their recipients will see "(No message
                written)".
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: "1.5rem",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginBottom: "0.75rem",
                textAlign: "center",
              }}
            >
              Need to add more people or fix a typo?
            </p>
            <button
              onClick={onReturnToSetup}
              className="btn btn-secondary"
              style={{
                width: "100%",
                borderColor: "#f87171",
                color: "#dc2626",
              }}
            >
              ⚠️ Unlock & Edit Participants
            </button>
          </div>
        </div>
      )}

      {!currentUser ? (
        <div className="card fade-in-up">
          <h2
            className="christmas-font"
            style={{
              fontSize: "2rem",
              marginBottom: "2rem",
              color: "#0a4d3c",
            }}
          >
            Select your name
          </h2>

          <div
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "1rem",
              border: "2px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginBottom: "0.5rem",
                fontWeight: 600,
              }}
            >
              Participants ({participants.length}):
            </p>
            <p style={{ color: "#374151" }}>
              {participants.map((p) => p.name).join(", ")}
            </p>
          </div>

          <div>
            {participants.map((p) => {
              const assignment = assignments.find((a) => a.santaId === p.id);
              const hasWritten = assignment?.messageSubmitted;

              return (
                <button
                  key={p.id}
                  onClick={() => onUserSelect(p.id)}
                  className="participant-btn"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      🎁 {p.name}
                    </span>
                    {hasWritten && (
                      <span
                        style={{
                          fontSize: "1rem",
                          background: "white",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                          flexShrink: 0,
                        }}
                      >
                        ✏️
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t">
            <button
              onClick={onStartReveal}
              className="btn btn-primary w-full"
            >
              {isAdmin
                ? "🎅 Start reveal"
                : "🎅 Start reveal (Admin code required)"}
            </button>
          </div>
        </div>
      ) : (
        userAssignment && (
          <div className="card scale-in">
            <h2
              className="christmas-font"
              style={{
                fontSize: "1.5rem",
                marginBottom: "1.5rem",
                color: "#0a4d3c",
              }}
            >
              {userAssignment.messageSubmitted
                ? "✏️ Edit Your Message"
                : "You've been paired with one teammate."}
            </h2>

            <div className="assignment-box">
              <p className="assignment-label">This message is for:</p>
              <p className="assignment-name christmas-font glow-text">
                {userAssignment.receiverName}
              </p>
            </div>

            <p
              style={{
                color: "#374151",
                marginBottom: "1.5rem",
                fontSize: "1.125rem",
                fontWeight: 500,
              }}
            >
              Write something kind, thoughtful, or lightly funny.
              <br />
              Keep it nice. Keep it human.
            </p>

            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#fef3c7",
                borderRadius: "0.75rem",
                border: "2px solid #f59e0b",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>⏰</span>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#92400e",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Once the reveal starts, you won't be able to write or edit your
                message!
              </p>
            </div>

            <textarea
              value={userAssignment.message}
              onChange={(e) =>
                onSaveMessage(userAssignment.assignmentId, e.target.value)
              }
              placeholder="Your message..."
              className="textarea"
            />

            <div className="flex gap-4 mt-6">
              {userAssignment.message.trim() && (
                <>
                  <button onClick={onShowPreview} className="btn btn-secondary">
                    Preview
                  </button>
                  <button
                    onClick={onShowEditConfirmation}
                    className="btn btn-primary"
                  >
                    {userAssignment.messageSubmitted
                      ? "Update message"
                      : "Save message"}
                  </button>
                </>
              )}
              <button onClick={onBack} className="btn btn-secondary">
                Back
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
