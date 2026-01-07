import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Gift, Heart, Sparkles, Eye, Flame, Star } from 'lucide-react';
import { db } from './firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import './SecretSanta.css';

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
        receiverId: shuffled[i].id
      }));
      
      for (let i = 0; i < n; i++) {
        const santa = assignments[i];
        const receiverAssignment = assignments.find(a => a.santaId === santa.receiverId);
        
        if (receiverAssignment && receiverAssignment.receiverId === santa.santaId) {
          valid = false;
          break;
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
        message: '',
        revealed: false
      }));
    }
    
    attempts++;
  }
  
  return null;
};

const REACTIONS = [
  { id: 'heart', label: 'wholesome', icon: Heart, color: '#ff6b9d' },
  { id: 'star', label: 'funny', icon: Star, color: '#ffd700' },
  { id: 'eye', label: 'suspicious', icon: Eye, color: '#8b5cf6' },
  { id: 'sparkle', label: 'thoughtful', icon: Sparkles, color: '#3b82f6' },
  { id: 'fire', label: 'iconic', icon: Flame, color: '#ff6b00' }
];

const ReactionIcon = ({ type, color }) => {
  const reaction = REACTIONS.find(r => r.id === type);
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
      animationDuration: `${duration}s`
    }}
  >
    ❄
  </div>
);

export default function SecretSanta() {
  const [phase, setPhase] = useState('setup');
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealStage, setRevealStage] = useState('name');
  const [showMessage, setShowMessage] = useState(false);
  const [reactions, setReactions] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [userPins, setUserPins] = useState({});
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pinError, setPinError] = useState('');
  
  const updateTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});
  
  const snowflakes = React.useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 10,
      left: Math.random() * 100
    }));
  }, []);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      const confirmReset = window.confirm('Emergency reset: Delete all data and start fresh?');
      if (confirmReset) {
        remove(ref(db, '/')).then(() => {
          window.location.href = window.location.pathname;
        });
        return;
      }
    }
    
    const applyBatchedUpdates = () => {
      const updates = pendingUpdatesRef.current;
      
      if (updates.phase !== undefined) setPhase(updates.phase);
      if (updates.participants !== undefined) setParticipants(updates.participants);
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
    
    const phaseRef = ref(db, 'santa-phase');
    const participantsRef = ref(db, 'santa-participants');
    const assignmentsRef = ref(db, 'santa-assignments');
    const reactionsRef = ref(db, 'santa-reactions');
    const adminCodeRef = ref(db, 'santa-admin-code');
    const revealStateRef = ref(db, 'santa-reveal-state');
    const userPinsRef = ref(db, 'santa-user-pins');
    
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
  }, []);
  
  useEffect(() => {
    if (phase === 'reveal' && revealStage === 'name' && !showMessage) {
      const timer = setTimeout(() => {
        saveRevealState(revealIndex, 'message', true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, revealStage, showMessage, revealIndex]);
  
  const savePhase = (newPhase) => {
    set(ref(db, 'santa-phase'), newPhase);
  };
  
  const saveParticipants = (newParticipants) => {
    set(ref(db, 'santa-participants'), newParticipants);
  };
  
  const saveAssignments = (newAssignments) => {
    set(ref(db, 'santa-assignments'), newAssignments);
  };
  
  const saveReactions = (newReactions) => {
    set(ref(db, 'santa-reactions'), newReactions);
  };
  
  const saveRevealState = useCallback((index, stage, messageShown = false) => {
    set(ref(db, 'santa-reveal-state'), { 
      index, 
      stage,
      showMessage: messageShown 
    });
  }, []);
  
  // Add participant
  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const newParticipant = {
      id: `user-${Date.now()}`,
      name: newParticipantName.trim()
    };
    
    saveParticipants([...participants, newParticipant]);
    setNewParticipantName('');
  };
  
  // Generate assignments
  const generateAssignments = async () => {
    if (participants.length < 2) {
      window.alert('Need at least 2 participants');
      return;
    }
    
    if (!adminCode.trim()) {
      window.alert('Please set an admin code first');
      return;
    }
    
    const derangement = generateDerangement(participants);
    if (!derangement) {
      window.alert('Failed to generate valid assignments. Try again.');
      return;
    }
    
    // Save admin code
    set(ref(db, 'santa-admin-code'), adminCode);
    
    // Shuffle reveal order
    const shuffled = [...derangement].sort(() => Math.random() - 0.5);
    saveAssignments(shuffled);
    savePhase('writing');
    setIsAdmin(true);
  };
  
  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setPinInput('');
    setPinError('');
    setShowPinPrompt(true);
  };
  
  const verifyPin = () => {
    const existingPin = userPins[selectedUserId];
    
    if (!existingPin) {
      // First time - set new PIN
      if (pinInput.length < 4) {
        setPinError('PIN must be at least 4 characters');
        return;
      }
      // Save new PIN
      set(ref(db, `santa-user-pins/${selectedUserId}`), pinInput);
      setCurrentUser(selectedUserId);
      setShowPinPrompt(false);
      setPinInput('');
    } else {
      // Verify existing PIN
      if (pinInput === existingPin) {
        setCurrentUser(selectedUserId);
        setShowPinPrompt(false);
        setPinInput('');
        setPinError('');
      } else {
        setPinError('Incorrect PIN');
        setPinInput('');
      }
    }
  };
  
  // Save message
  const saveMessage = (assignmentId, message) => {
    const updated = assignments.map(a =>
      a.assignmentId === assignmentId ? { ...a, message } : a
    );
    saveAssignments(updated);
  };
  
  // Start reveal
  const startReveal = () => {
    if (!isAdmin) {
      setShowAdminPrompt(true);
      return;
    }
    savePhase('reveal');
    saveRevealState(0, 'name', false);
  };
  
  // Verify admin code
  const verifyAdminCode = () => {
    if (adminCodeInput === adminCode) {
      setIsAdmin(true);
      setShowAdminPrompt(false);
      setAdminCodeInput('');
      if (phase === 'writing') {
        savePhase('reveal');
        saveRevealState(0, 'name', false);
      }
    } else {
      window.alert('Incorrect admin code');
      setAdminCodeInput('');
    }
  };
  
  // Next message
  const nextMessage = () => {
    if (revealIndex < assignments.length - 1) {
      saveRevealState(revealIndex + 1, 'name', false);
      setShowConfetti(false);
    } else {
      savePhase('finale');
      setShowConfetti(true);
    }
  };
  
  // Reveal author
  const revealAuthor = () => {
    saveRevealState(revealIndex, 'author', true);
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
  
  const resetAll = async () => {
    if (!window.confirm('Reset everything? This cannot be undone.')) return;
    
    try {
      await remove(ref(db, 'santa-phase'));
      await remove(ref(db, 'santa-participants'));
      await remove(ref(db, 'santa-assignments'));
      await remove(ref(db, 'santa-reactions'));
      await remove(ref(db, 'santa-reveal-state'));
      await remove(ref(db, 'santa-admin-code'));
      await remove(ref(db, 'santa-user-pins'));
      
      setPhase('setup');
      setParticipants([]);
      setAssignments([]);
      setCurrentUser(null);
      setRevealIndex(0);
      setRevealStage('name');
      setShowMessage(false);
      setReactions({});
      setAdminCode('');
      setIsAdmin(false);
      setUserPins({});
    } catch (error) {
      console.error('Reset failed:', error);
    }
  };
  
  const currentAssignment = assignments[revealIndex];
  const userAssignment = assignments.find(a => a.santaId === currentUser);
  
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
          if (window.confirm('Start fresh session? This will delete all data.')) {
            remove(ref(db, '/')).then(() => window.location.reload());
          }
        }}
        className="dev-reset-btn"
        title="Reset all data and start fresh"
      >
        Dev Reset
      </button>
      
      <div className="content-wrapper">
        
        <div className="header fade-in-up">
          <div className="header-ornaments">
            <span className="ornament ornament-red"></span>
            <span className="ornament ornament-gold"></span>
            <Gift className="text-yellow-300" size={48} style={{ color: '#fde047' }} />
            <h1 className="header-title christmas-font glow-text">
              Secret Santa
            </h1>
            <Gift className="text-yellow-300" size={48} style={{ color: '#fde047' }} />
            <span className="ornament ornament-gold"></span>
            <span className="ornament ornament-green"></span>
          </div>
          <p className="header-subtitle">
            {phase === 'setup' && '✨ Share appreciation with your team ✨'}
            {phase === 'writing' && '📝 Write your message'}
            {phase === 'reveal' && '🎉 The reveal begins 🎉'}
            {phase === 'finale' && '🎊 Celebrating Together 🎊'}
          </p>
        </div>
        
        {showConfetti && (
          <div>
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  background: ['#c41e3a', '#ffd700', '#4ecdc4', '#ff6b6b', '#8b2e2e'][Math.floor(Math.random() * 5)],
                  animationDelay: `${Math.random() * 0.8}s`
                }}
              />
            ))}
          </div>
        )}
        
        {phase === 'setup' && (
          <div className="card fade-in-up">
            <h2 className="christmas-font" style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0a4d3c' }}>
              Add participants
            </h2>
            
            <div className="flex gap-3 mb-8">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="Enter name"
                className="input"
              />
              <button onClick={addParticipant} className="btn btn-primary">
                Add
              </button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              {participants.map((p) => (
                <div key={p.id} className="participant-item">
                  <span className="participant-name">{p.name}</span>
                  <button
                    onClick={() => saveParticipants(participants.filter(pp => pp.id !== p.id))}
                    className="participant-remove"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#0a4d3c' }}>
                Set Admin Code (required)
              </label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Create a secret code for admin"
                className="input"
                style={{ marginBottom: '0.5rem' }}
              />
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
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
        
        {phase === 'writing' && (
          <div>
            {!currentUser ? (
              <div className="card fade-in-up">
                <h2 className="christmas-font" style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0a4d3c' }}>
                  Select your name
                </h2>
                
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '1rem', border: '2px solid #e5e7eb' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Participants ({participants.length}):
                  </p>
                  <p style={{ color: '#374151' }}>
                    {participants.map(p => p.name).join(', ')}
                  </p>
                </div>
                
                <div>
                  {participants.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleUserSelect(p.id)}
                      className="participant-btn"
                    >
                      🎁 {p.name}
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 pt-8 border-t">
                  <button onClick={startReveal} className="btn btn-primary w-full">
                    {isAdmin ? '🎅 Start reveal' : '🎅 Start reveal (Admin code required)'}
                  </button>
                </div>
              </div>
            ) : userAssignment && (
              <div className="card scale-in">
                <h2 className="christmas-font" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0a4d3c' }}>
                  You've been paired with one teammate.
                </h2>
                
                <div className="assignment-box">
                  <p className="assignment-label">This message is for:</p>
                  <p className="assignment-name christmas-font glow-text">
                    {userAssignment.receiverName}
                  </p>
                </div>
                
                <p style={{ color: '#374151', marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 500 }}>
                  Write something kind, thoughtful, or lightly funny.<br/>
                  Keep it nice. Keep it human.
                </p>
                
                <textarea
                  value={userAssignment.message}
                  onChange={(e) => saveMessage(userAssignment.assignmentId, e.target.value)}
                  placeholder="Your message..."
                  className="textarea"
                />
                
                <div className="flex gap-4 mt-6">
                  {userAssignment.message.trim() && (
                    <button
                      onClick={() => {
                        window.alert('Saved. Your secret is safe.');
                        setCurrentUser(null);
                      }}
                      className="btn btn-primary"
                    >
                      💾 Save message
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentUser(null)}
                    className="btn btn-secondary"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {phase === 'reveal' && currentAssignment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card progress-card">
              <p className="progress-text christmas-font">
                🎁 Message {revealIndex + 1} of {assignments.length}
              </p>
            </div>
            
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
                      {currentAssignment.message || '(No message written)'}
                    </p>
                  </div>
                  
                  {revealStage !== 'author' && (
                    <div className="reactions-container scale-in">
                      <p className="reactions-prompt">
                        React if this made you smile
                      </p>
                      <div className="reactions-grid">
                        {REACTIONS.map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => addReaction(currentAssignment.assignmentId, id)}
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
                  
                  {revealStage === 'author' && (
                    <div className="author-reveal scale-in">
                      <div className="flex items-center" style={{ justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <span className="author-reveal-icon">🎉</span>
                        <h3 className="author-reveal-title christmas-font glow-text">
                          Written by:<br/>{currentAssignment.santaName}
                        </h3>
                        <span className="author-reveal-icon">🎉</span>
                      </div>
                      
                      <div className="reactions-container">
                        <p className="reactions-prompt">
                          Final reactions
                        </p>
                        <div className="reactions-grid">
                          {REACTIONS.map(({ id, label }) => (
                            <button
                              key={id}
                              onClick={() => addReaction(currentAssignment.assignmentId, id)}
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
            
            {/* Admin Controls */}
            {isAdmin && (
              <div className="card controls-card">
                <div className="controls-buttons">
                  {revealStage === 'message' && (
                    <button onClick={revealAuthor} className="btn btn-primary" style={{ fontSize: '1.25rem' }}>
                      🎅 Reveal author
                    </button>
                  )}
                  
                  {revealStage === 'author' && revealIndex < assignments.length - 1 && (
                    <button onClick={nextMessage} className="btn btn-primary" style={{ fontSize: '1.25rem' }}>
                      Next message
                    </button>
                  )}
                  
                  {revealIndex === assignments.length - 1 && revealStage === 'author' && (
                    <button onClick={nextMessage} className="btn btn-primary" style={{ fontSize: '1.25rem' }}>
                      🎉 Continue to Finale
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {!isAdmin && (
              <div className="card controls-card">
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '1rem', marginBottom: '1rem' }}>
                  Waiting for admin to control the reveal...
                </p>
                <button
                  onClick={() => setShowAdminPrompt(true)}
                  className="btn btn-secondary"
                  style={{ margin: '0 auto', display: 'block' }}
                >
                  Enter admin code
                </button>
              </div>
            )}
          </div>
        )}
        
        {phase === 'finale' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card finale-card scale-in">
              <div className="finale-celebration">
                <div className="finale-icon">🎊</div>
                <h1 className="finale-title christmas-font glow-text">
                  What a Journey!
                </h1>
                <div className="finale-icon">🎊</div>
              </div>
              
              <p className="finale-message">
                Thank you for sharing kindness, gratitude, and appreciation with each other. 
                These moments of connection make our team truly special.
              </p>
              
              <div className="finale-stats">
                <div className="finale-stat-item">
                  <div className="finale-stat-number christmas-font">{assignments.length}</div>
                  <div className="finale-stat-label">Heartfelt Messages</div>
                </div>
                <div className="finale-stat-divider">✨</div>
                <div className="finale-stat-item">
                  <div className="finale-stat-number christmas-font">
                    {Object.values(reactions).reduce((sum, count) => sum + count, 0)}
                  </div>
                  <div className="finale-stat-label">Reactions of Joy</div>
                </div>
                <div className="finale-stat-divider">✨</div>
                <div className="finale-stat-item">
                  <div className="finale-stat-number christmas-font">{participants.length}</div>
                  <div className="finale-stat-label">Amazing People</div>
                </div>
              </div>
              
              <div className="finale-participants-section">
                <h3 className="finale-section-title christmas-font">Our Team 🎄</h3>
                <div className="finale-participants-grid">
                  {participants.map((participant) => (
                    <div key={participant.id} className="finale-participant-card">
                      <span className="finale-participant-emoji">🎁</span>
                      <span className="finale-participant-name">{participant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {isAdmin && (
                <div className="finale-actions">
                  <button 
                    onClick={resetAll} 
                    className="btn btn-primary"
                    style={{ fontSize: '1.25rem', marginTop: '1rem' }}
                  >
                    Start New Session
                  </button>
                </div>
              )}
              
              {!isAdmin && (
                <div className="finale-actions">
                  <p style={{ color: '#6b7280', fontSize: '1rem', textAlign: 'center' }}>
                    Waiting for admin to start a new session...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {showAdminPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', padding: '2rem' }}>
            <h3 className="christmas-font" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0a4d3c', textAlign: 'center' }}>
              Admin Access Required
            </h3>
            <p style={{ marginBottom: '1.5rem', color: '#374151', textAlign: 'center' }}>
              Enter the admin code to start the reveal
            </p>
            <input
              type="password"
              value={adminCodeInput}
              onChange={(e) => setAdminCodeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && verifyAdminCode()}
              placeholder="Enter admin code"
              className="input"
              style={{ marginBottom: '1rem' }}
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
                  setAdminCodeInput('');
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '400px', padding: '2rem' }}>
            <h3 className="christmas-font" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0a4d3c', textAlign: 'center' }}>
              {!userPins[selectedUserId] ? 'Create Your PIN' : 'Enter Your PIN'}
            </h3>
            <p style={{ marginBottom: '1.5rem', color: '#374151', textAlign: 'center' }}>
              {!userPins[selectedUserId] 
                ? 'Set a PIN to protect your message (minimum 4 characters)'
                : 'Enter your PIN to access your message'
              }
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && verifyPin()}
              placeholder={!userPins[selectedUserId] ? "Create PIN (min 4 chars)" : "Enter PIN"}
              className="input"
              style={{ marginBottom: '0.5rem' }}
              autoFocus
            />
            {pinError && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
                {pinError}
              </p>
            )}
            <div className="flex gap-3" style={{ marginTop: '1rem' }}>
              <button
                onClick={verifyPin}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {!userPins[selectedUserId] ? 'Set PIN' : 'Verify'}
              </button>
              <button
                onClick={() => {
                  setShowPinPrompt(false);
                  setPinInput('');
                  setPinError('');
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
    </div>
  );
}