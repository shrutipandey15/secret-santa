import { Heart, Star, Eye, Sparkles, Flame } from "lucide-react";

const REACTIONS = [
  { id: "heart", label: "wholesome", icon: Heart, color: "#ff6b9d" },
  { id: "star", label: "funny", icon: Star, color: "#ffd700" },
  { id: "eye", label: "suspicious", icon: Eye, color: "#8b5cf6" },
  { id: "sparkle", label: "thoughtful", icon: Sparkles, color: "#3b82f6" },
  { id: "fire", label: "iconic", icon: Flame, color: "#ff6b00" },
];

const ReactionIcon = ({ type, color }) => {
  const reaction = REACTIONS.find((r) => r.id === type);
  if (!reaction) return null;

  const Icon = reaction.icon;
  return (
    <div className={`reaction-icon reaction-${type}`}>
      <Icon size={32} strokeWidth={2.5} color={color || reaction.color} />
    </div>
  );
};

export default function RevealPhase({
  currentAssignment,
  showMessage,
  revealStage,
  getRandomFallback,
  onAddReaction,
  getReactionCount,
  isAdmin,
  revealIndex,
  assignmentsLength,
  onRevealAuthor,
  onPreviousMessage,
  onNextMessage,
  onShowAdminPrompt,
}) {
  if (!currentAssignment) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div className="card scale-in">
        <div className="reveal-header fade-in-up">
          <h2 className="reveal-header-title christmas-font">
            A message written for
          </h2>
          <p className="reveal-header-name christmas-font glow-text">
            {currentAssignment.receiverName}
          </p>
        </div>

        {showMessage && (
          <div className="fade-in-up">
            <div className="message-box">
              <p className="message-text">
                {currentAssignment.message || getRandomFallback()}
                {!currentAssignment.message && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      marginTop: "1rem",
                      fontStyle: "italic",
                      opacity: 0.7,
                    }}
                  >
                    (The Secret Santa was too shy to write a message, so the
                    elves wrote this one!)
                  </span>
                )}
              </p>
            </div>

            {revealStage !== "author" && (
              <div className="reactions-container scale-in">
                <p className="reactions-prompt">React if this made you smile</p>
                <div className="reactions-grid">
                  {REACTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() =>
                        onAddReaction(currentAssignment.assignmentId, id)
                      }
                      className="reaction-btn"
                      title={label}
                    >
                      <ReactionIcon type={id} />
                      <span className="reaction-count">
                        {getReactionCount(currentAssignment.assignmentId, id)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {revealStage === "author" && (
              <div className="author-reveal scale-in">
                <div
                  className="flex items-center"
                  style={{
                    justifyContent: "center",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <span className="author-reveal-icon">🎉</span>
                  <h3 className="author-reveal-title christmas-font glow-text">
                    Written by:
                    <br />
                    {currentAssignment.santaName}
                  </h3>
                  <span className="author-reveal-icon">🎉</span>
                </div>

                <div className="reactions-container">
                  <p className="reactions-prompt">Final reactions</p>
                  <div className="reactions-grid">
                    {REACTIONS.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() =>
                          onAddReaction(currentAssignment.assignmentId, id)
                        }
                        className="reaction-btn"
                        title={label}
                      >
                        <ReactionIcon type={id} />
                        <span className="reaction-count">
                          {getReactionCount(currentAssignment.assignmentId, id)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="card controls-card">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            {/* Progress indicator */}
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#9ca3af",
                  marginBottom: "0.25rem",
                }}
              >
                Message
              </p>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#0a4d3c",
                }}
              >
                {revealIndex + 1} / {assignmentsLength}
              </p>
            </div>

            {/* Single row of controls */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Previous button */}
              <button
                onClick={onPreviousMessage}
                disabled={revealIndex === 0}
                className="btn btn-secondary"
                style={{
                  fontSize: "1.125rem",
                  minWidth: "100px",
                  opacity: revealIndex === 0 ? 0.5 : 1,
                  cursor: revealIndex === 0 ? "not-allowed" : "pointer",
                }}
              >
                ← Prev
              </button>

              {/* Reveal author button (only if not revealed) */}
              {revealStage === "message" && (
                <button
                  onClick={onRevealAuthor}
                  className="btn btn-primary"
                  style={{
                    fontSize: "1.125rem",
                    minWidth: "160px",
                    background: "#c41e3a",
                  }}
                >
                  🎅 Show Author
                </button>
              )}

              {/* Next/Finale button */}
              {revealIndex < assignmentsLength - 1 ? (
                <button
                  onClick={onNextMessage}
                  className="btn btn-primary"
                  style={{
                    fontSize: "1.125rem",
                    minWidth: "100px",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={onNextMessage}
                  className="btn btn-primary"
                  style={{
                    fontSize: "1.125rem",
                    minWidth: "160px",
                    background: "#0a4d3c",
                  }}
                >
                  🎉 Finale
                </button>
              )}
            </div>

            {/* Keyboard hint */}
            <p
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              💡 Keyboard: ← → to navigate | Space to reveal author
            </p>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="card controls-card">
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: "1rem",
              marginBottom: "1rem",
            }}
          >
            Waiting for admin to control the reveal...
          </p>
          <button
            onClick={onShowAdminPrompt}
            className="btn btn-secondary"
            style={{ margin: "0 auto", display: "block" }}
          >
            Enter admin code
          </button>
        </div>
      )}
    </div>
  );
}
