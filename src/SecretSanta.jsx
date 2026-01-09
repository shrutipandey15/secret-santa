import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Gift, Loader2 } from "lucide-react";
import { db } from "./firebase";
import { ref, set, onValue, remove } from "firebase/database";
import "./SecretSanta.css";

// Components
import Snowflake from "./components/Snowflake";
import AdminPromptModal from "./components/modals/AdminPromptModal";
import PinPromptModal from "./components/modals/PinPromptModal";
import PreviewModal from "./components/modals/PreviewModal";
import EditConfirmationModal from "./components/modals/EditConfirmationModal";
import SetupPhase from "./components/phases/SetupPhase";
import WritingPhase from "./components/phases/WritingPhase";
import RevealPhase from "./components/phases/RevealPhase";
import FinalePhase from "./components/phases/FinalePhase";

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

const FALLBACK_MESSAGES = [
  "You're an awesome team member!⭐",
  "May your year be sparklier than this app! ✨",
];

const getRandomFallback = () => {
  return FALLBACK_MESSAGES[
    Math.floor(Math.random() * FALLBACK_MESSAGES.length)
  ];
};

export default function SecretSanta() {
  const [sessionId, setSessionId] = useState(null);
  const [sessionInput, setSessionInput] = useState("");
  const [phase, setPhase] = useState("setup");
  const [isLoading, setIsLoading] = useState(false);
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
  const [isAdmin, setIsAdmin] = useState(() => {
    if (!sessionId) return false;
    const stored = localStorage.getItem(`admin-${sessionId}`);
    return stored === "true";
  });
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

  const snowflakes = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 10,
      left: Math.random() * 100,
    }));
  }, []);

  const currentAssignment = useMemo(
    () => assignments[revealIndex],
    [assignments, revealIndex]
  );

  const userAssignment = useMemo(
    () => assignments.find((a) => a.santaId === currentUser),
    [assignments, currentUser]
  );

  useEffect(() => {
    console.log("--- Debug: Effect 1 running (checking URL) ---");
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get("session");

    if (urlSessionId) {
      setIsLoading(true);
      console.log("Debug: Found session ID in URL:", urlSessionId);
      setSessionId((prevId) => {
        if (prevId !== urlSessionId) {
          return urlSessionId;
        }
        return prevId;
      });
    } else {
      console.log("Debug: No session ID in URL.");
    }

    if (urlParams.get("reset") === "true") {
      const confirmReset = window.confirm(
        "Emergency reset: Delete all data and start fresh?"
      );
      if (confirmReset) {
        const targetSession = urlParams.get("session");
        if (targetSession) {
          remove(ref(db, `sessions/${targetSession}`)).then(() => {
            window.location.href = window.location.pathname;
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      const stored = localStorage.getItem(`admin-${sessionId}`);
      if (stored === "true") {
        setIsAdmin(true);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    console.log(
      "--- Debug: Effect 2 running. Current sessionId state:",
      sessionId
    );

    if (!sessionId) {
      return;
    }
    
    setIsLoading(true);

    console.log("Debug: Starting Firebase listeners for session:", sessionId);

    const applyBatchedUpdates = () => {
      const updates = pendingUpdatesRef.current;

      if (updates.phase !== undefined) setPhase(updates.phase);
      if (updates.participants !== undefined) {
        setParticipants(updates.participants);
      }
      if (updates.assignments !== undefined) setAssignments(updates.assignments);
      if (updates.reactions !== undefined) setReactions(updates.reactions);
      if (updates.adminCode !== undefined) setAdminCode(updates.adminCode);
      if (updates.revealState !== undefined) {
        const val = updates.revealState;
        setRevealIndex(val.index || 0);
        setRevealStage(val.stage || "name");
        setShowMessage(val.showMessage || false);
      }
      if (updates.userPins !== undefined) setUserPins(updates.userPins);

      pendingUpdatesRef.current = {};
      
      setIsLoading(false);
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

    const activeSessionId = sessionId;

    const phaseRef = ref(db, `sessions/${activeSessionId}/phase`);
    const participantsRef = ref(db, `sessions/${activeSessionId}/participants`);
    const assignmentsRef = ref(db, `sessions/${activeSessionId}/assignments`);
    const reactionsRef = ref(db, `sessions/${activeSessionId}/reactions`);
    const adminCodeRef = ref(db, `sessions/${activeSessionId}/admin-code`);
    const revealStateRef = ref(db, `sessions/${activeSessionId}/reveal-state`);
    const userPinsRef = ref(db, `sessions/${activeSessionId}/user-pins`);

    const unsubPhase = onValue(phaseRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        scheduleUpdate("phase", val);
      } else {
        setIsLoading(false);
      }
    });

    const unsubParticipants = onValue(participantsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate("participants", val);
    });

    const unsubAssignments = onValue(assignmentsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate("assignments", val);
    });

    const unsubReactions = onValue(reactionsRef, (snapshot) => {
      const val = snapshot.val();
      scheduleUpdate("reactions", val || {});
    });

    const unsubAdminCode = onValue(adminCodeRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate("adminCode", val);
    });

    const unsubRevealState = onValue(revealStateRef, (snapshot) => {
      const val = snapshot.val();
      if (val) scheduleUpdate("revealState", val);
    });

    const unsubUserPins = onValue(userPinsRef, (snapshot) => {
      const val = snapshot.val();
      scheduleUpdate("userPins", val || {});
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

  useEffect(() => {
    if (phase === "reveal" && revealStage === "name" && !showMessage) {
      const timer = setTimeout(() => {
        saveRevealState(revealIndex, "message", true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, revealStage, showMessage, revealIndex, saveRevealState]);

  const previousMessage = useCallback(() => {
    if (revealIndex > 0) {
      saveRevealState(revealIndex - 1, "author", true);
      setShowConfetti(false);
    }
  }, [revealIndex, saveRevealState]);

  const nextMessage = useCallback(() => {
    if (revealIndex < assignments.length - 1) {
      saveRevealState(revealIndex + 1, "name", false);
      setShowConfetti(false);
    } else {
      if (!sessionId) return;
      set(ref(db, `sessions/${sessionId}/phase`), "finale");
      setShowConfetti(true);
    }
  }, [revealIndex, assignments.length, saveRevealState, sessionId]);

  const revealAuthor = useCallback(() => {
    saveRevealState(revealIndex, "author", true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, [revealIndex, saveRevealState]);

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
        nextMessage();
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (revealStage === "message") {
          revealAuthor();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, isAdmin, revealStage, previousMessage, nextMessage, revealAuthor]);

  const savePhase = useCallback(
    (newPhase) => {
      if (!sessionId) return;
      set(ref(db, `sessions/${sessionId}/phase`), newPhase);
    },
    [sessionId]
  );

  const saveParticipants = useCallback(
    (newParticipants) => {
      if (!sessionId) return;
      set(ref(db, `sessions/${sessionId}/participants`), newParticipants);
    },
    [sessionId]
  );

  const saveAssignments = useCallback(
    (newAssignments) => {
      if (!sessionId) return;
      set(ref(db, `sessions/${sessionId}/assignments`), newAssignments);
    },
    [sessionId]
  );

  const saveReactions = useCallback(
    (newReactions) => {
      if (!sessionId) return;
      set(ref(db, `sessions/${sessionId}/reactions`), newReactions);
    },
    [sessionId]
  );

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createNewSession = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    const url = new URL(window.location);
    url.searchParams.set("session", newSessionId);
    window.history.pushState({}, "", url);
  }, []);

  const joinSession = useCallback(() => {
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
  }, [sessionInput]);

  const copySessionLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Session link copied! Share it with your team.");
    });
  }, [sessionId]);

  const addParticipant = useCallback(() => {
    if (!newParticipantName.trim()) return;

    const newParticipant = {
      id: `user-${Date.now()}`,
      name: newParticipantName.trim(),
    };

    saveParticipants([...participants, newParticipant]);
    setNewParticipantName("");
  }, [newParticipantName, participants, saveParticipants]);

  const removeParticipant = useCallback(
    (participantId) => {
      saveParticipants(participants.filter((p) => p.id !== participantId));
    },
    [participants, saveParticipants]
  );

  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const generateAssignments = useCallback(async () => {
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

    set(ref(db, `sessions/${sessionId}/admin-code`), simpleHash(adminCode));
    const shuffled = [...derangement].sort(() => Math.random() - 0.5);
    saveAssignments(shuffled);
    savePhase("writing");
    setIsAdmin(true);
    localStorage.setItem(`admin-${sessionId}`, "true");
  }, [participants, adminCode, sessionId, saveAssignments, savePhase]);

  const handleUserSelect = useCallback((userId) => {
    setSelectedUserId(userId);
    setPinInput("");
    setPinError("");
    setShowPinPrompt(true);
  }, []);

  const verifyPin = useCallback(() => {
    const existingPin = userPins[selectedUserId];

    if (!existingPin) {
      if (pinInput.length < 4) {
        setPinError("PIN must be at least 4 characters");
        return;
      }
      set(
        ref(db, `sessions/${sessionId}/user-pins/${selectedUserId}`),
        pinInput
      );
      setCurrentUser(selectedUserId);
      setShowPinPrompt(false);
      setPinInput("");
    } else {
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
  }, [userPins, selectedUserId, pinInput, sessionId]);

  const saveMessage = useCallback(
    (assignmentId, message) => {
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
    },
    [assignments, saveAssignments]
  );

  const startReveal = useCallback(() => {
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
  }, [isAdmin, assignments, savePhase, saveRevealState]);

  const verifyAdminCode = useCallback(() => {
    // During setup phase, there's no admin code in database yet
    // Just grant admin access - they'll set the code when generating assignments
    if (phase === "setup") {
      setIsAdmin(true);
      localStorage.setItem(`admin-${sessionId}`, "true");
      setShowAdminPrompt(false);
      setAdminCodeInput("");
      return;
    }

    // For other phases, verify against stored admin code
    if (simpleHash(adminCodeInput) === adminCode) {
      setIsAdmin(true);
      localStorage.setItem(`admin-${sessionId}`, "true");
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
  }, [adminCodeInput, adminCode, phase, savePhase, saveRevealState, sessionId]);

  const addReaction = useCallback(
    (assignmentId, emoji) => {
      const key = `${assignmentId}-${emoji}`;
      const newReactions = { ...reactions };

      if (!newReactions[key]) {
        newReactions[key] = 0;
      }
      newReactions[key]++;

      saveReactions(newReactions);
    },
    [reactions, saveReactions]
  );

  const getReactionCount = useCallback(
    (assignmentId, emoji) => {
      const key = `${assignmentId}-${emoji}`;
      return reactions[key] || 0;
    },
    [reactions]
  );

  const resetAll = useCallback(async () => {
    if (!sessionId) return;
    if (!window.confirm("Reset everything? This cannot be undone.")) return;

    try {
      await remove(ref(db, `sessions/${sessionId}`));
      localStorage.removeItem(`admin-${sessionId}`);
      window.location.reload();
    } catch (error) {
      console.error("Reset failed:", error);
    }
  }, [sessionId]);

  const returnToSetup = useCallback(async () => {
    if (
      !window.confirm(
        "⚠️ Unlock to add people?\n\nThis will KEEP the current list of names, but it MUST re-shuffle the assignments to include the new people.\n\nAre you sure?"
      )
    ) {
      return;
    }

    try {
      const updates = {};
      updates[`sessions/${sessionId}/phase`] = "setup";
      updates[`sessions/${sessionId}/assignments`] = null;
      await db.ref().update(updates);
    } catch (e) {
      set(ref(db, `sessions/${sessionId}/phase`), "setup");
      set(ref(db, `sessions/${sessionId}/assignments`), null);
    }
  }, [sessionId]);

  const handleCancelPinPrompt = useCallback(() => {
    setShowPinPrompt(false);
    setPinInput("");
    setPinError("");
    setSelectedUserId(null);
  }, []);

  const handleCancelAdminPrompt = useCallback(() => {
    setShowAdminPrompt(false);
    setAdminCodeInput("");
  }, []);

  const handleDoneEditing = useCallback(() => {
    setShowEditConfirmation(false);
    setCurrentUser(null);
  }, []);

  const handleKeepEditing = useCallback(() => {
    setShowEditConfirmation(false);
  }, []);

  if (isLoading) {
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
        <div className="content-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
          <div className="header-ornaments" style={{ marginBottom: '1rem' }}>
             <Gift className="text-yellow-300" size={48} style={{ color: "#fde047" }} />
          </div>
          <h2 className="christmas-font glow-text" style={{ fontSize: '2rem', color: '#fff' }}>
            Loading North Pole Data...
          </h2>
          <Loader2 className="animate-spin" style={{ color: '#fff', marginTop: '1rem' }} size={32} />
        </div>
      </div>
    );
  }

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

      {isAdmin && sessionId && (
        <button
          onClick={() => {
            if (
              window.confirm("Start fresh session? This will delete all data.")
            ) {
              localStorage.removeItem(`admin-${sessionId}`);
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
      )}

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
              <SetupPhase
                newParticipantName={newParticipantName}
                setNewParticipantName={setNewParticipantName}
                onAddParticipant={addParticipant}
                participants={participants}
                onRemoveParticipant={removeParticipant}
                adminCode={adminCode}
                setAdminCode={setAdminCode}
                onGenerateAssignments={generateAssignments}
                isAdmin={isAdmin}
                onResetAll={resetAll}
                onBecomeAdmin={() => setShowAdminPrompt(true)}
              />
            )}

            {phase === "writing" && (
              <WritingPhase
                isAdmin={isAdmin}
                assignments={assignments}
                participants={participants}
                onReturnToSetup={returnToSetup}
                currentUser={currentUser}
                onUserSelect={handleUserSelect}
                onStartReveal={startReveal}
                userAssignment={userAssignment}
                onSaveMessage={saveMessage}
                onShowPreview={() => setShowPreview(true)}
                onShowEditConfirmation={() => setShowEditConfirmation(true)}
                onBack={() => setCurrentUser(null)}
              />
            )}

            {phase === "reveal" && (
              <RevealPhase
                currentAssignment={currentAssignment}
                showMessage={showMessage}
                revealStage={revealStage}
                getRandomFallback={getRandomFallback}
                onAddReaction={addReaction}
                getReactionCount={getReactionCount}
                isAdmin={isAdmin}
                revealIndex={revealIndex}
                assignmentsLength={assignments.length}
                onRevealAuthor={revealAuthor}
                onPreviousMessage={previousMessage}
                onNextMessage={nextMessage}
                onShowAdminPrompt={() => setShowAdminPrompt(true)}
              />
            )}

            {phase === "finale" && (
              <FinalePhase
                assignments={assignments}
                reactions={reactions}
                participants={participants}
                isAdmin={isAdmin}
                onResetAll={resetAll}
              />
            )}
          </>
        )}
      </div>

      <AdminPromptModal
        isOpen={showAdminPrompt}
        adminCodeInput={adminCodeInput}
        setAdminCodeInput={setAdminCodeInput}
        onVerify={verifyAdminCode}
        onCancel={handleCancelAdminPrompt}
        isSetupPhase={phase === "setup"}
      />

      <PinPromptModal
        isOpen={showPinPrompt}
        selectedUserId={selectedUserId}
        userPins={userPins}
        pinInput={pinInput}
        setPinInput={setPinInput}
        pinError={pinError}
        setPinError={setPinError}
        onVerify={verifyPin}
        onCancel={handleCancelPinPrompt}
      />

      <PreviewModal
        isOpen={showPreview && currentUser}
        receiverName={userAssignment?.receiverName}
        message={userAssignment?.message}
        getRandomFallback={getRandomFallback}
        onClose={() => setShowPreview(false)}
      />

      <EditConfirmationModal
        isOpen={showEditConfirmation && currentUser}
        isUpdate={userAssignment?.messageSubmitted}
        onDone={handleDoneEditing}
        onKeepEditing={handleKeepEditing}
      />
    </div>
  );
}