import React, { useState, useEffect, useCallback, useRef } from "react";
import { Gift, Heart, Sparkles, Eye, Flame, Star } from "lucide-react";
import { db } from "./firebase";
import { ref, set, onValue, remove } from "firebase/database";
import "./SecretSanta.css";

const generateDerangement = (participants) => {
  const n = participants.length;
  if (n < 2) return null;

  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    let valid = true;

    for (let i = 0; i < n; i++) {
      if (participants[i].id === shuffled[i].id) {
        valid = false;
        break;
      }
    }

    if (valid) {
      const assignments = participants.map((santa, i) => ({
        santaId: santa.id,
        receiverId: shuffled[i].id,
      }));
      if (n > 2) {
        for (let i = 0; i < n; i++) {
          const santa = assignments[i];
          const receiverAssignment = assignments.find(
            (a) => a.santaId === santa.receiverId
          );

          if (
            receiverAssignment &&
            receiverAssignment.receiverId === santa.santaId
          ) {
            valid = false;
            break;
          }
        }
      }
    }

    if (valid) {
      return participants.map((santa, i) => ({
        assignmentId: `assign-${i}`,
        santaId: santa.id,
        santaName: santa.name,
        receiverId: shuffled[i].id,
        receiverName: shuffled[i].name,
        message: "",
        messageSubmitted: false,
        revealed: false,
      }));
    }

    attempts++;
  }

  return null;
};

const REACTIONS = [
  { id: "heart", label: "wholesome", icon: Heart, color: "#ff6b9d" },
  { id: "star", label: "funny", icon: Star, color: "#ffd700" },
  { id: "eye", label: "suspicious", icon: Eye, color: "#8b5cf6" },
  { id: "sparkle", label: "thoughtful", icon: Sparkles, color: "#3b82f6" },
  { id: "fire", label: "iconic", icon: Flame, color: "#ff6b00" },
];

const FALLBACK_MESSAGES = [
  "You're an awesome team member!⭐",
  "May your year be sparklier than this app! ✨",
];

const getRandomFallback = () => {
  return FALLBACK_MESSAGES[
    Math.floor(Math.random() * FALLBACK_MESSAGES.length)
  ];
};

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

const Snowflake = ({ delay, duration, left }) => (
  <div
    className="snowflake"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    ❄
  </div>
);

export default function SecretSanta() {
  const [sessionId, setSessionId] = useState(null);
  const [sessionInput, setSessionInput] = useState("");
  const [phase, setPhase] = useState("setup");
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealStage, setRevealStage] = useState("name");
  const [showMessage, setShowMessage] = useState(false);
  const [reactions, setReactions] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [userPins, setUserPins] = useState({});
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pinError, setPinError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);

  const updateTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});

  const snowflakes = React.useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 10,
      left: Math.random() * 100,
    }));
  }, []);

  useEffect(() => {
    console.log("--- Debug: Effect 1 running (checking URL) ---");
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');
    
    if (urlSessionId) {
      console.log("Debug: Found session ID in URL:", urlSessionId);
      setSessionId((prevId) => {
         if (prevId !== urlSessionId) {
             console.log("Debug: Setting session ID state to:", urlSessionId);
             return urlSessionId;
         }
         return prevId;
      });
    } else {
      console.log("Debug: No session ID in URL.");
    }
    
    if (urlParams.get('reset') === 'true') {
      const confirmReset = window.confirm('Emergency reset: Delete all data and start fresh?');
      if (confirmReset) {
        const targetSession = urlParams.get('session');
        if (targetSession) {
          remove(ref(db, `sessions/${targetSession}`)).then(() => {
            window.location.href = window.location.pathname;
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    console.log("--- Debug: Effect 2 running. Current sessionId state:", sessionId);
    
    if (!sessionId) {
        console.log("Debug: Session ID is null, waiting...");
        return; // WAIT until we have the ID, then sync
    }

    console.log("Debug: Starting Firebase listeners for session:", sessionId);
    
    const applyBatchedUpdates = () => {
      const updates = pendingUpdatesRef.current;
      console.log("Debug: Applying batched updates to state:", Object.keys(updates));
      
      if (updates.phase !== undefined) setPhase(updates.phase);
      // ADDED DEBUG LOG FOR PARTICIPANTS UPDATE
      if (updates.participants !== undefined) {
          console.log("Debug: Updating participants state with:", updates.participants);
          setParticipants(updates.participants);
      }
      if (updates.assignments !== undefined) setAssignments(updates.assignments);
      if (updates.reactions !== undefined) setReactions(updates.reactions);
      if (updates.adminCode !== undefined) setAdminCode(updates.adminCode);
      if (updates.revealState !== undefined) {
        const val = updates.revealState;
        setRevealIndex(val.index || 0);
        setRevealStage(val.stage || 'name');
        setShowMessage(val.showMessage || false);
      }
      if (updates.userPins !== undefined) setUserPins(updates.userPins);
      
      pendingUpdatesRef.current = {};
    };
    
    const scheduleUpdate = (key, value) => {
      pendingUpdatesRef.current[key] = value;
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        applyBatchedUpdates();
        updateTimeoutRef.current = null;
      }, 16);
    };
    
    const activeSessionId = sessionId; // We know sessionId exists here
    
    const phaseRef = ref(db, `sessions/${activeSessionId}/phase`);
    const participantsRef = ref(db, `sessions/${activeSessionId}/participants`);
    const assignmentsRef = ref(db, `sessions/${activeSessionId}/assignments`);
    const reactionsRef = ref(db, `sessions/${activeSessionId}/reactions`);
    const adminCodeRef = ref(db, `sessions/${activeSessionId}/admin-code`);
    const revealStateRef = ref(db, `sessions/${activeSessionId}/reveal-state`);
    const userPinsRef = ref(db, `sessions/${activeSessionId}/user-pins`);
    
    const unsubPhase = onValue(phaseRef, (snapshot) => {
      const val = snapshot.val();

      if (val) scheduleUpdate('phase', val);
    });
    
    const unsubParticipants = onValue(participantsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate('participants', val);
    });
    
    const unsubAssignments = onValue(assignmentsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate('assignments', val);
    });
    
    const unsubReactions = onValue(reactionsRef, (snapshot) => {
      const val = snapshot.val();
      scheduleUpdate('reactions', val || {});
    });
    
    const unsubAdminCode = onValue(adminCodeRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate('adminCode', val);
    });
    
    const unsubRevealState = onValue(revealStateRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate('revealState', val);
    });
    
    const unsubUserPins = onValue(userPinsRef, (snapshot) => {
      const val = snapshot.val();
      scheduleUpdate('userPins', val || {});
    });
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      unsubPhase();
      unsubParticipants();
      unsubAssignments();
      unsubReactions();
      unsubAdminCode();
      unsubRevealState();
      unsubUserPins();
    };
  }, [sessionId]);

  useEffect(() => {
    if (phase === "reveal" && revealStage === "name" && !showMessage) {
      const timer = setTimeout(() => {
        saveRevealState(revealIndex, "message", true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, revealStage, showMessage, revealIndex]);

  useEffect(() => {
    if (phase !== "reveal" || !isAdmin) return;

    const handleKeyPress = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousMessage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (revealStage === "message") {
          revealAuthor();
        } else if (revealStage === "author") {
          nextMessage();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, isAdmin, revealIndex, revealStage, assignments.length]);

  const savePhase = (newPhase) => {
    if (!sessionId) return;
    set(ref(db, `sessions/${sessionId}/phase`), newPhase);
  };

  const saveParticipants = (newParticipants) => {
    if (!sessionId) return;
    set(ref(db, `sessions/${sessionId}/participants`), newParticipants);
  };

  const saveAssignments = (newAssignments) => {
    if (!sessionId) return;
    set(ref(db, `sessions/${sessionId}/assignments`), newAssignments);
  };

  const saveReactions = (newReactions) => {
    if (!sessionId) return;
    set(ref(db, `sessions/${sessionId}/reactions`), newReactions);
  };

  const saveRevealState = useCallback(
    (index, stage, messageShown = false) => {
      if (!sessionId) return;
      set(ref(db, `sessions/${sessionId}/reveal-state`), {
        index,
        stage,
        showMessage: messageShown,
      });
    },
    [sessionId]
  );

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createNewSession = () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    const url = new URL(window.location);
    url.searchParams.set("session", newSessionId);
    window.history.pushState({}, "", url);
  };

  const joinSession = () => {
    if (!sessionInput.trim() || sessionInput.length !== 6) {
      alert("Please enter a valid 6-character session code");
      return;
    }
    const uppercaseSessionId = sessionInput.toUpperCase();
    setSessionId(uppercaseSessionId);
    const url = new URL(window.location);
    url.searchParams.set("session", uppercaseSessionId);
    window.history.pushState({}, "", url);
    setSessionInput("");
  };

  const copySessionLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Session link copied! Share it with your team.");
    });
  };

  // Add participant
  const addParticipant = () => {
    if (!newParticipantName.trim()) return;

    const newParticipant = {
      id: `user-${Date.now()}`,
      name: newParticipantName.trim(),
    };

    saveParticipants([...participants, newParticipant]);
    setNewParticipantName("");
  };

  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  };
  // Generate assignments
  const generateAssignments = async () => {
    if (participants.length < 2) {
      window.alert("Need at least 2 participants");
      return;
    }

    if (!adminCode.trim()) {
      window.alert("Please set an admin code first");
      return;
    }

    const derangement = generateDerangement(participants);
    if (!derangement) {
      window.alert("Failed to generate valid assignments. Try again.");
      return;
    }

    // Save admin code
    set(ref(db, `sessions/${sessionId}/admin-code`), simpleHash(adminCode));
    // Shuffle reveal order
    const shuffled = [...derangement].sort(() => Math.random() - 0.5);
    saveAssignments(shuffled);
    savePhase("writing");
    setIsAdmin(true);
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setPinInput("");
    setPinError("");
    setShowPinPrompt(true);
  };

  const verifyPin = () => {
    const existingPin = userPins[selectedUserId];

    if (!existingPin) {
      // First time - set new PIN
      if (pinInput.length < 4) {
        setPinError("PIN must be at least 4 characters");
        return;
      }
      // Save new PIN
      set(
        ref(db, `sessions/${sessionId}/user-pins/${selectedUserId}`),
        pinInput
      );
      setCurrentUser(selectedUserId);
      setShowPinPrompt(false);
      setPinInput("");
    } else {
      // Verify existing PIN
      if (pinInput === existingPin) {
        setCurrentUser(selectedUserId);
        setShowPinPrompt(false);
        setPinInput("");
        setPinError("");
      } else {
        setPinError("Incorrect PIN");
        setPinInput("");
      }
    }
  };

  // Save message
  const saveMessage = (assignmentId, message) => {
    const updated = assignments.map((a) =>
      a.assignmentId === assignmentId
        ? {
            ...a,
            message,
            messageSubmitted: message.trim().length > 0,
          }
        : a
    );
    saveAssignments(updated);
  };

  // Start reveal
  const startReveal = () => {
    if (!isAdmin) {
      setShowAdminPrompt(true);
      return;
    }

    const incompleteMessages = assignments.filter((a) => !a.messageSubmitted);

    if (incompleteMessages.length > 0) {
      const names = incompleteMessages.map((a) => a.santaName).join(", ");
      const warning = `Warning: ${incompleteMessages.length} person(s) haven't written their message yet:\n\n${names}\n\nTheir recipients will see "(No message written)"\n\nContinue anyway?`;

      if (!window.confirm(warning)) {
        return;
      }
    }

    savePhase("reveal");
    saveRevealState(0, "name", false);
  };

  // Verify admin code
  const verifyAdminCode = () => {
    if (simpleHash(adminCodeInput) === adminCode) {
      setIsAdmin(true);
      setShowAdminPrompt(false);
      setAdminCodeInput("");
      if (phase === "writing") {
        savePhase("reveal");
        saveRevealState(0, "name", false);
      }
    } else {
      window.alert("Incorrect admin code");
      setAdminCodeInput("");
    }
  };
  // Next message
  const nextMessage = () => {
    if (revealIndex < assignments.length - 1) {
      saveRevealState(revealIndex + 1, "name", false);
      setShowConfetti(false);
    } else {
      savePhase("finale");
      setShowConfetti(true);
    }
  };

  const previousMessage = () => {
    if (revealIndex > 0) {
      saveRevealState(revealIndex - 1, "author", true);
      setShowConfetti(false);
    }
  };

  // Reveal author
  const revealAuthor = () => {
    saveRevealState(revealIndex, "author", true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Add reaction
  const addReaction = (assignmentId, emoji) => {
    const key = `${assignmentId}-${emoji}`;
    const newReactions = { ...reactions };

    if (!newReactions[key]) {
      newReactions[key] = 0;
    }
    newReactions[key]++;

    saveReactions(newReactions);
  };

  const getReactionCount = (assignmentId, emoji) => {
    const key = `${assignmentId}-${emoji}`;
    return reactions[key] || 0;
  };

  // 1. Fix the broken Reset All function
  const resetAll = async () => {
    if (!sessionId) return;
    if (!window.confirm('Reset everything? This cannot be undone.')) return;
    
    try {
      // FIX: Use the correct session path!
      await remove(ref(db, `sessions/${sessionId}`));
      window.location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
    }
  };

  const returnToSetup = async () => {
    if (!window.confirm('⚠️ Unlock to add people?\n\nThis will KEEP the current list of names, but it MUST re-shuffle the assignments to include the new people.\n\nAre you sure?')) {
      return;
    }
    
    try {
      // Try atomic update
      const updates = {};
      updates[`sessions/${sessionId}/phase`] = 'setup';
      updates[`sessions/${sessionId}/assignments`] = null;
      await db.ref().update(updates);
    } catch (e) {
      set(ref(db, `sessions/${sessionId}/phase`), 'setup');
      set(ref(db, `sessions/${sessionId}/assignments`), null);
    }
  };

  const currentAssignment = assignments[revealIndex];
  const userAssignment = assignments.find((a) => a.santaId === currentUser);

  return (
    <div className="app-container">
      {snowflakes.map((flake) => (
        <Snowflake
          key={flake.id}
          delay={flake.delay}
          duration={flake.duration}
          left={flake.left}
        />
      ))}

      <button
        onClick={() => {
          if (
            window.confirm("Start fresh session? This will delete all data.")
          ) {
            remove(ref(db, `sessions/${sessionId}`)).then(() =>
              window.location.reload()
            );
          }
        }}
        className="dev-reset-btn"
        title="Reset all data and start fresh"
      >
        Dev Reset
      </button>

      <div className="content-wrapper">
        {!sessionId && (
          <div className="fade-in-up" style={{ marginTop: "2rem" }}>
            <div className="header">
              <div className="header-ornaments">
                <Gift
                  className="text-yellow-300"
                  size={48}
                  style={{ color: "#fde047" }}
                />
                <h1 className="header-title christmas-font glow-text">
                  Secret Santa
                </h1>
                <Gift
                  className="text-yellow-300"
                  size={48}
                  style={{ color: "#fde047" }}
                />
              </div>
              <p className="header-subtitle">
                ✨ Multi-Team Appreciation Portal ✨
              </p>
            </div>

            <div className="card scale-in">
              <h2
                className="christmas-font"
                style={{
                  fontSize: "2rem",
                  marginBottom: "1.5rem",
                  color: "#0a4d3c",
                  textAlign: "center",
                }}
              >
                Start or Join a Session
              </h2>

              <p
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  marginBottom: "2rem",
                  fontSize: "1.125rem",
                }}
              >
                Each team needs their own session. Create a new one or join an
                existing session with a code.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}
              >
                <div
                  style={{
                    padding: "2rem",
                    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                    borderRadius: "1rem",
                    border: "3px solid #10b981",
                  }}
                >
                  <h3
                    className="christmas-font"
                    style={{
                      fontSize: "1.5rem",
                      marginBottom: "1rem",
                      color: "#0a4d3c",
                      textAlign: "center",
                    }}
                  >
                    🎄 Create New Session
                  </h3>
                  <p
                    style={{
                      textAlign: "center",
                      color: "#374151",
                      marginBottom: "1.5rem",
                    }}
                  >
                    Start a new Secret Santa for your team
                  </p>
                  <button
                    onClick={createNewSession}
                    className="btn btn-primary"
                    style={{ width: "100%", fontSize: "1.25rem" }}
                  >
                    🎅 Create Session
                  </button>
                </div>

                <div
                  style={{
                    padding: "2rem",
                    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                    borderRadius: "1rem",
                    border: "3px solid #f59e0b",
                  }}
                >
                  <h3
                    className="christmas-font"
                    style={{
                      fontSize: "1.5rem",
                      marginBottom: "1rem",
                      color: "#0a4d3c",
                      textAlign: "center",
                    }}
                  >
                    🎁 Join Existing Session
                  </h3>
                  <p
                    style={{
                      textAlign: "center",
                      color: "#374151",
                      marginBottom: "1.5rem",
                    }}
                  >
                    Enter the 6-character session code shared by your team
                  </p>
                  <input
                    type="text"
                    value={sessionInput}
                    onChange={(e) =>
                      setSessionInput(e.target.value.toUpperCase())
                    }
                    placeholder="Enter code (e.g., ABC123)"
                    maxLength={6}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      fontSize: "1.5rem",
                      textAlign: "center",
                      border: "3px solid #f59e0b",
                      borderRadius: "0.75rem",
                      marginBottom: "1rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      fontWeight: "bold",
                    }}
                  />
                  <button
                    onClick={joinSession}
                    className="btn btn-primary"
                    style={{ width: "100%", fontSize: "1.25rem" }}
                  >
                    Join Session
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  background: "#f3f4f6",
                  borderRadius: "0.75rem",
                  border: "2px solid #d1d5db",
                }}
              ></div>
            </div>
          </div>
        )}

        {sessionId && (
          <>
            <div className="header fade-in-up">
              <div className="header-ornaments">
                <span className="ornament ornament-red"></span>
                <span className="ornament ornament-gold"></span>
                <Gift
                  className="text-yellow-300"
                  size={48}
                  style={{ color: "#fde047" }}
                />
                <h1 className="header-title christmas-font glow-text">
                  Secret Santa
                </h1>
                <Gift
                  className="text-yellow-300"
                  size={48}
                  style={{ color: "#fde047" }}
                />
                <span className="ornament ornament-gold"></span>
                <span className="ornament ornament-green"></span>
              </div>
              <p className="header-subtitle">
                {phase === "setup" && "✨ Share appreciation with your team ✨"}
                {phase === "writing" && "📝 Write your message"}
                {phase === "reveal" && "🎉 The reveal begins 🎉"}
                {phase === "finale" && "🎊 Celebrating Together 🎊"}
              </p>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1.5rem",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "1rem",
                  border: "2px solid rgba(255, 215, 0, 0.5)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#fde047",
                      marginBottom: "0.25rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Session Code
                  </p>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "white",
                      letterSpacing: "0.3em",
                      fontFamily: "monospace",
                    }}
                  >
                    {sessionId}
                  </p>
                </div>
                <button
                  onClick={copySessionLink}
                  style={{
                    background: "#ffd700",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                    color: "#0a4d3c",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.transform = "scale(1.05)")
                  }
                  onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                >
                  Copy Link
                </button>
              </div>
            </div>

            {showConfetti && (
              <div>
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: "-20px",
                      background: [
                        "#c41e3a",
                        "#ffd700",
                        "#4ecdc4",
                        "#ff6b6b",
                        "#8b2e2e",
                      ][Math.floor(Math.random() * 5)],
                      animationDelay: `${Math.random() * 0.8}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {phase === "setup" && (
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
                    onKeyPress={(e) => e.key === "Enter" && addParticipant()}
                    placeholder="Enter name"
                    className="input"
                  />
                  <button onClick={addParticipant} className="btn btn-primary">
                    Add
                  </button>
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  {participants.map((p) => (
                    <div key={p.id} className="participant-item">
                      <span className="participant-name">{p.name}</span>
                      <button
                        onClick={() =>
                          saveParticipants(
                            participants.filter((pp) => pp.id !== p.id)
                          )
                        }
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
                    onClick={generateAssignments}
                    disabled={participants.length < 2 || !adminCode.trim()}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    🎄 Generate assignments
                  </button>
                  {participants.length > 0 && isAdmin && (
                    <button onClick={resetAll} className="btn btn-secondary">
                      Reset all
                    </button>
                  )}
                </div>
              </div>
            )}

            {phase === "writing" && (
              <div>
                {isAdmin && (
                  <div
                    className="card fade-in-up"
                    style={{ marginBottom: "2rem" }}
                  >
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
                        {assignments.filter((a) => a.messageSubmitted).length} /{" "}
                        {assignments.length}
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
                              <span
                                style={{ color: "#6b7280", fontSize: "1rem" }}
                              >
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
                              color: assignment.messageSubmitted
                                ? "#059669"
                                : "#dc2626",
                            }}
                          >
                            {assignment.messageSubmitted
                              ? "Submitted"
                              : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {assignments.filter((a) => !a.messageSubmitted).length >
                      0 && (
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
                          {
                            assignments.filter((a) => !a.messageSubmitted)
                              .length
                          }{" "}
                          person(s) haven't written yet. You can still start the
                          reveal, but their recipients will see "(No message
                          written)".
                        </p>
                      </div>
                    )}
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem', textAlign: 'center' }}>
                    Need to add more people or fix a typo?
                  </p>
                  <button 
                    onClick={returnToSetup}
                    className="btn btn-secondary"
                    style={{ width: '100%', borderColor: '#f87171', color: '#dc2626' }}
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
                        const userAssignment = assignments.find(
                          (a) => a.santaId === p.id
                        );
                        const hasWritten = userAssignment?.messageSubmitted;

                        return (
                          <button
                            key={p.id}
                            onClick={() => handleUserSelect(p.id)}
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
                        onClick={startReveal}
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
                          Once the reveal starts, you won't be able to write or
                          edit your message!
                        </p>
                      </div>

                      <textarea
                        value={userAssignment.message}
                        onChange={(e) =>
                          saveMessage(
                            userAssignment.assignmentId,
                            e.target.value
                          )
                        }
                        placeholder="Your message..."
                        className="textarea"
                      />

                      <div className="flex gap-4 mt-6">
                        {userAssignment.message.trim() && (
                          <>
                            <button
                              onClick={() => setShowPreview(true)}
                              className="btn btn-secondary"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => {
                                setShowEditConfirmation(true);
                              }}
                              className="btn btn-primary"
                            >
                              {userAssignment.messageSubmitted
                                ? "Update message"
                                : "Save message"}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setCurrentUser(null)}
                          className="btn btn-secondary"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {phase === "reveal" && currentAssignment && (
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
                              (The Secret Santa was too shy to write a message,
                              so the elves wrote this one!)
                            </span>
                          )}
                        </p>
                      </div>

                      {revealStage !== "author" && (
                        <div className="reactions-container scale-in">
                          <p className="reactions-prompt">
                            React if this made you smile
                          </p>
                          <div className="reactions-grid">
                            {REACTIONS.map(({ id, label }) => (
                              <button
                                key={id}
                                onClick={() =>
                                  addReaction(
                                    currentAssignment.assignmentId,
                                    id
                                  )
                                }
                                className="reaction-btn"
                                title={label}
                              >
                                <ReactionIcon type={id} />
                                <span className="reaction-count">
                                  {getReactionCount(
                                    currentAssignment.assignmentId,
                                    id
                                  )}
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
                                    addReaction(
                                      currentAssignment.assignmentId,
                                      id
                                    )
                                  }
                                  className="reaction-btn"
                                  title={label}
                                >
                                  <ReactionIcon type={id} />
                                  <span className="reaction-count">
                                    {getReactionCount(
                                      currentAssignment.assignmentId,
                                      id
                                    )}
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
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: "bold",
                          color: "#6b7280",
                          textAlign: "center",
                        }}
                      >
                        Message {revealIndex + 1} of {assignments.length}
                      </p>

                      {revealStage === "message" && (
                        <button
                          onClick={revealAuthor}
                          className="btn btn-primary"
                          style={{ fontSize: "1.25rem", minWidth: "220px" }}
                        >
                          🎅 Reveal author
                        </button>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "1rem",
                          width: "100%",
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {revealIndex > 0 && (
                          <button
                            onClick={previousMessage}
                            className="btn btn-secondary"
                            style={{ fontSize: "1.125rem", minWidth: "140px" }}
                          >
                            Previous
                          </button>
                        )}

                        {revealStage === "author" &&
                          revealIndex < assignments.length - 1 && (
                            <button
                              onClick={nextMessage}
                              className="btn btn-primary"
                              style={{
                                fontSize: "1.125rem",
                                minWidth: "140px",
                              }}
                            >
                              Next
                            </button>
                          )}

                        {revealIndex === assignments.length - 1 &&
                          revealStage === "author" && (
                            <button
                              onClick={nextMessage}
                              className="btn btn-primary"
                              style={{ fontSize: "1.25rem", minWidth: "220px" }}
                            >
                              🎉 Continue to Finale
                            </button>
                          )}
                      </div>

                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "#9ca3af",
                          textAlign: "center",
                          marginTop: "0.5rem",
                        }}
                      >
                        💡 Use ← → arrow keys to navigate
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
                      onClick={() => setShowAdminPrompt(true)}
                      className="btn btn-secondary"
                      style={{ margin: "0 auto", display: "block" }}
                    >
                      Enter admin code
                    </button>
                  </div>
                )}
              </div>
            )}

            {phase === "finale" && (
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
                    Thank you for sharing kindness, gratitude, and appreciation
                    with each other. These moments of connection make our team
                    truly special.
                  </p>

                  <div className="finale-stats">
                    <div className="finale-stat-item">
                      <div className="finale-stat-number christmas-font">
                        {assignments.length}
                      </div>
                      <div className="finale-stat-label">
                        Heartfelt Messages
                      </div>
                    </div>
                    <div className="finale-stat-divider">✨</div>
                    <div className="finale-stat-item">
                      <div className="finale-stat-number christmas-font">
                        {Object.values(reactions).reduce(
                          (sum, count) => sum + count,
                          0
                        )}
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

                  {/* Participants Grid */}
                  <div className="finale-participants-section">
                    <h3 className="finale-section-title christmas-font">
                      Our Team 🎄
                    </h3>
                    <div className="finale-participants-grid">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="finale-participant-card"
                        >
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
                        onClick={resetAll}
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
            )}
          </>
        )}
      </div>

      {showAdminPrompt && (
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
          }}
        >
          <div className="card" style={{ maxWidth: "400px", padding: "2rem" }}>
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
              Enter the admin code to start the reveal
            </p>
            <input
              type="password"
              value={adminCodeInput}
              onChange={(e) => setAdminCodeInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && verifyAdminCode()}
              placeholder="Enter admin code"
              className="input"
              style={{ marginBottom: "1rem" }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={verifyAdminCode}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Verify
              </button>
              <button
                onClick={() => {
                  setShowAdminPrompt(false);
                  setAdminCodeInput("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPinPrompt && selectedUserId && (
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
          }}
        >
          <div className="card" style={{ maxWidth: "400px", padding: "2rem" }}>
            <h3
              className="christmas-font"
              style={{
                fontSize: "1.5rem",
                marginBottom: "1rem",
                color: "#0a4d3c",
                textAlign: "center",
              }}
            >
              {!userPins[selectedUserId] ? "Create Your PIN" : "Enter Your PIN"}
            </h3>
            <p
              style={{
                marginBottom: "1.5rem",
                color: "#374151",
                textAlign: "center",
              }}
            >
              {!userPins[selectedUserId]
                ? "Set a PIN to protect your message (minimum 4 characters)"
                : "Enter your PIN to access your message"}
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError("");
              }}
              onKeyPress={(e) => e.key === "Enter" && verifyPin()}
              placeholder={
                !userPins[selectedUserId]
                  ? "Create PIN (min 4 chars)"
                  : "Enter PIN"
              }
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
                onClick={verifyPin}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {!userPins[selectedUserId] ? "Set PIN" : "Verify"}
              </button>
              <button
                onClick={() => {
                  setShowPinPrompt(false);
                  setPinInput("");
                  setPinError("");
                  setSelectedUserId(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && currentUser && (
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
          <div
            className="card"
            style={{ maxWidth: "700px", width: "100%", padding: "2rem" }}
          >
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

            <div
              className="reveal-header fade-in-up"
              style={{ marginBottom: "2rem" }}
            >
              <h2 className="reveal-header-title christmas-font">
                A message written for
              </h2>
              <p className="reveal-header-name christmas-font glow-text">
                {
                  assignments.find((a) => a.santaId === currentUser)
                    ?.receiverName
                }
              </p>
            </div>

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

            <button
              onClick={() => setShowPreview(false)}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1.5rem" }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {showEditConfirmation && currentUser && (
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
          }}
        >
          <div className="card" style={{ maxWidth: "500px", padding: "2rem" }}>
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
              {assignments.find((a) => a.santaId === currentUser)
                ?.messageSubmitted
                ? "Message Updated!"
                : "Message Saved!"}
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

            <div
              style={{ display: "flex", gap: "1rem", flexDirection: "column" }}
            >
              <button
                onClick={() => {
                  setShowEditConfirmation(false);
                  setCurrentUser(null);
                }}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                Done
              </button>
              <button
                onClick={() => setShowEditConfirmation(false)}
                className="btn btn-secondary"
                style={{ width: "100%" }}
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
