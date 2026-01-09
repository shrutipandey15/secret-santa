import React from "react";

export default function FinalePhase({
  assignments,
  reactions,
  participants,
  isAdmin,
  onResetAll,
}) {
  const totalReactions = Object.values(reactions).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div className="card finale-card scale-in">
        <div className="finale-celebration">
          <div className="finale-icon">🎊</div>
          <h1 className="finale-title christmas-font glow-text">
            What a Journey!
          </h1>
          <div className="finale-icon">🎊</div>
        </div>

        <p className="finale-message">
          Thank you for sharing kindness, gratitude, and appreciation with each
          other. These moments of connection make our team truly special.
        </p>

        <div className="finale-stats">
          <div className="finale-stat-item">
            <div className="finale-stat-number christmas-font">
              {assignments.length}
            </div>
            <div className="finale-stat-label">Heartfelt Messages</div>
          </div>
          <div className="finale-stat-divider">✨</div>
          <div className="finale-stat-item">
            <div className="finale-stat-number christmas-font">
              {totalReactions}
            </div>
            <div className="finale-stat-label">Reactions of Joy</div>
          </div>
          <div className="finale-stat-divider">✨</div>
          <div className="finale-stat-item">
            <div className="finale-stat-number christmas-font">
              {participants.length}
            </div>
            <div className="finale-stat-label">Amazing People</div>
          </div>
        </div>

        <div className="finale-participants-section">
          <h3 className="finale-section-title christmas-font">Our Team 🎄</h3>
          <div className="finale-participants-grid">
            {participants.map((participant) => (
              <div key={participant.id} className="finale-participant-card">
                <span className="finale-participant-emoji">🎁</span>
                <span className="finale-participant-name">
                  {participant.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="finale-actions">
            <button
              onClick={onResetAll}
              className="btn btn-primary"
              style={{ fontSize: "1.25rem", marginTop: "1rem" }}
            >
              Start New Session
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="finale-actions">
            <p
              style={{
                color: "#6b7280",
                fontSize: "1rem",
                textAlign: "center",
              }}
            >
              Waiting for admin to start a new session...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
