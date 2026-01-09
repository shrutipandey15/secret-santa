import BaseModal from "./BaseModal";

export default function AdminPromptModal({
  isOpen,
  adminCodeInput,
  setAdminCodeInput,
  onVerify,
  onCancel,
  isSetupPhase,
}) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") onVerify();
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
        Admin Access Required
      </h3>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "#374151",
          textAlign: "center",
        }}
      >
        {isSetupPhase
          ? "Click Continue to set up the Secret Santa session"
          : "Enter the admin code to start the reveal"}
      </p>
      {!isSetupPhase && (
        <input
          type="password"
          value={adminCodeInput}
          onChange={(e) => setAdminCodeInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter admin code"
          className="input"
          style={{ marginBottom: "1rem" }}
          autoFocus
        />
      )}
      <div className="flex gap-3">
        <button
          onClick={onVerify}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          {isSetupPhase ? "Continue" : "Verify"}
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </BaseModal>
  );
}
