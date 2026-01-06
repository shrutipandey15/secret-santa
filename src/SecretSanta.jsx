import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Heart, Sparkles, Eye, Flame, Star } from 'lucide-react';
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
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const phaseData = await window.storage.get('santa-phase');
        const participantsData = await window.storage.get('santa-participants');
        const assignmentsData = await window.storage.get('santa-assignments');
        const reactionsData = await window.storage.get('santa-reactions', true);
        const revealData = await window.storage.get('santa-reveal-state', true);
        const adminCodeData = await window.storage.get('santa-admin-code');
        
        if (phaseData) setPhase(JSON.parse(phaseData.value));
        if (participantsData) setParticipants(JSON.parse(participantsData.value));
        if (assignmentsData) setAssignments(JSON.parse(assignmentsData.value));
        if (reactionsData) setReactions(JSON.parse(reactionsData.value));
        if (adminCodeData) setAdminCode(JSON.parse(adminCodeData.value));
        if (revealData) {
          const state = JSON.parse(revealData.value);
          setRevealIndex(state.index || 0);
          setRevealStage(state.stage || 'name');
          setShowMessage(state.showMessage || false);
        }
      } catch (error) {
        console.log('Starting fresh session');
      }
    };
    loadData();
  }, []);
  
  useEffect(() => {
    if (phase === 'reveal' && revealStage === 'name' && !showMessage) {
      const timer = setTimeout(() => {
        setShowMessage(true);
        saveRevealState(revealIndex, 'message', true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, revealStage, showMessage, revealIndex]);
  
  useEffect(() => {
    if (phase !== 'reveal') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const revealData = await window.storage.get('santa-reveal-state', true);
        if (revealData) {
          const state = JSON.parse(revealData.value);
          setRevealIndex(state.index || 0);
          setRevealStage(state.stage || 'name');
          setShowMessage(state.showMessage || false);
        }
      } catch (error) {
      }
    }, 1000);
    
    return () => clearInterval(pollInterval);
  }, [phase]);
  
  useEffect(() => {
    if (phase !== 'reveal') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const reactionsData = await window.storage.get('santa-reactions', true);
        if (reactionsData) {
          setReactions(JSON.parse(reactionsData.value));
        }
      } catch (error) {
      }
    }, 500);
    
    return () => clearInterval(pollInterval);
  }, [phase]);
  
  // Save phase
  const savePhase = async (newPhase) => {
    setPhase(newPhase);
    await window.storage.set('santa-phase', JSON.stringify(newPhase));
  };
  
  // Save participants
  const saveParticipants = async (newParticipants) => {
    setParticipants(newParticipants);
    await window.storage.set('santa-participants', JSON.stringify(newParticipants));
  };
  
  // Save assignments
  const saveAssignments = async (newAssignments) => {
    setAssignments(newAssignments);
    await window.storage.set('santa-assignments', JSON.stringify(newAssignments));
  };
  
  // Save reactions (shared)
  const saveReactions = async (newReactions) => {
    setReactions(newReactions);
    await window.storage.set('santa-reactions', JSON.stringify(newReactions), true);
  };
  
  // Save reveal state (shared)
  const saveRevealState = useCallback(async (index, stage, messageShown = false) => {
    setRevealIndex(index);
    setRevealStage(stage);
    setShowMessage(messageShown);
    await window.storage.set('santa-reveal-state', JSON.stringify({ 
      index, 
      stage,
      showMessage: messageShown 
    }), true);
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
    await window.storage.set('santa-admin-code', JSON.stringify(adminCode));
    
    // Shuffle reveal order
    const shuffled = [...derangement].sort(() => Math.random() - 0.5);
    saveAssignments(shuffled);
    savePhase('writing');
    setIsAdmin(true);
  };
  
  // Select user to write message
  const selectUser = (userId) => {
    setCurrentUser(userId);
  };
  
  // Save message
  const saveMessage = async (assignmentId, message) => {
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
    }
  };
  
  // Reveal author
  const revealAuthor = () => {
    saveRevealState(revealIndex, 'author', true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };
  
  // Toggle reaction
  const addReaction = async (assignmentId, emoji) => {
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
  
  // Reset everything
  const resetAll = async () => {
    if (!window.confirm('Reset everything? This cannot be undone.')) return;
    
    try {
      await window.storage.delete('santa-phase');
      await window.storage.delete('santa-participants');
      await window.storage.delete('santa-assignments');
      await window.storage.delete('santa-reactions', true);
      await window.storage.delete('santa-reveal-state', true);
      await window.storage.delete('santa-admin-code');
      
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
    } catch (error) {
      console.error('Reset failed:', error);
    }
  };
  
  const currentAssignment = assignments[revealIndex];
  const userAssignment = assignments.find(a => a.santaId === currentUser);
  
  return (
    <div className="app-container">
      {Array.from({ length: 30 }).map((_, i) => (
        <Snowflake
          key={i}
          delay={Math.random() * 10}
          duration={10 + Math.random() * 10}
          left={Math.random() * 100}
        />
      ))}
      
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
                      onClick={() => selectUser(p.id)}
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
                        React if this made you smile 👇
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
                          Final reactions 👇
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
                      ➡️ Next message
                    </button>
                  )}
                  
                  {revealIndex === assignments.length - 1 && revealStage === 'author' && (
                    <button onClick={resetAll} className="btn btn-secondary" style={{ fontSize: '1.25rem' }}>
                      🔄 Start over
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
    </div>
  );
}