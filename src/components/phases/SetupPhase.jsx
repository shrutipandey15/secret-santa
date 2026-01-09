export default function SetupPhase({
  newParticipantName,
  setNewParticipantName,
  onAddParticipant,
  participants,
  onRemoveParticipant,
  adminCode,
  setAdminCode,
  onGenerateAssignments,
  isAdmin,
  onResetAll,
  onBecomeAdmin,
}) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") onAddParticipant();
  };

  if (!isAdmin) {
    return (
      <div className="card fade-in-up">
        <h2
          className="christmas-font"
          style={{
            fontSize: "2rem",
            marginBottom: "2rem",
            color: "#0a4d3c",
            textAlign: "center",
          }}
        >
          Setting up Secret Santa...
        </h2>

        <div
          style={{
            padding: "2rem",
            background: "#f9fafb",
            borderRadius: "1rem",
            border: "2px solid #e5e7eb",
            marginBottom: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "1.125rem",
              color: "#374151",
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
            The admin is currently adding participants.
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            You'll be notified when it's time to write your message!
          </p>
        </div>

        {participants.length > 0 && (
          <div
            style={{
              padding: "1.5rem",
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              borderRadius: "1rem",
              border: "2px solid #f59e0b",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#92400e",
                marginBottom: "0.75rem",
                fontWeight: 600,
              }}
            >
              Participants so far ({participants.length}):
            </p>
            <p style={{ color: "#78350f" }}>
              {participants.map((p) => p.name).join(", ")}
            </p>
          </div>
        )}

        <button
          onClick={onBecomeAdmin}
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: "1rem" }}
        >
          I'm the admin - Let me set this up
        </button>
      </div>
    );
  }

  return (
    <div className="card fade-in-up">
      <h2
        className="christmas-font"
        style={{
          fontSize: "2rem",
          marginBottom: "2rem",
          color: "#0a4d3c",
        }}
      >
        Add participants
      </h2>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={newParticipantName}
          onChange={(e) => setNewParticipantName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter name"
          className="input"
        />
        <button onClick={onAddParticipant} className="btn btn-primary">
          Add
        </button>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        {participants.map((p) => (
          <div key={p.id} className="participant-item">
            <span className="participant-name">{p.name}</span>
            <button
              onClick={() => onRemoveParticipant(p.id)}
              className="participant-remove"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            color: "#0a4d3c",
          }}
        >
          Set Admin Code (required)
        </label>
        <input
          type="password"
          value={adminCode}
          onChange={(e) => setAdminCode(e.target.value)}
          placeholder="Create a secret code for admin"
          className="input"
          style={{ marginBottom: "0.5rem" }}
        />
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Only people with this code can control the reveal
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onGenerateAssignments}
          disabled={participants.length < 2 || !adminCode.trim()}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          🎄 Generate assignments
        </button>
        {participants.length > 0 && (
          <button onClick={onResetAll} className="btn btn-secondary">
            Reset all
          </button>
        )}
      </div>
    </div>
  );
}
