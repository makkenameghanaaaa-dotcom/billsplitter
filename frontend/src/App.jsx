import React, { useState, useEffect } from 'react';
import './App.css';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut, 
  onAuthStateChanged
} from './firebase';
import { 
  subscribeToGroups, 
  createGroup, 
  deleteGroup, 
  addMemberToGroup, 
  subscribeToExpenses, 
  addExpense, 
  deleteExpense, 
  settleAllDebts 
} from './services/firestoreService';
import { simplifyDebts } from './utils/balanceCalculator';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Group State
  const [groups, setGroups] = useState([]);
  const [groupData, setGroupData] = useState({ name: '', baseCurrency: 'USD' });
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Expense & Member State
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', currency: 'USD', paidBy: '' });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newMember, setNewMember] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auto-dismiss transient notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setSelectedGroup(null);
        setGroups([]);
        setExpenses([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore Groups when logged in
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToGroups(
      user.uid,
      (fetchedGroups) => {
        setGroups(fetchedGroups);
        if (selectedGroup) {
          const updated = fetchedGroups.find(g => g.id === selectedGroup.id);
          if (updated) setSelectedGroup(updated);
        }
      },
      (err) => setNotification({ type: 'error', text: err.message })
    );

    return () => unsubscribe();
  }, [user, selectedGroup?.id]);

  // Listen to Firestore Expenses when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;

    const unsubscribe = subscribeToExpenses(
      selectedGroup.id,
      (fetchedExpenses) => {
        setExpenses(fetchedExpenses);
      },
      (err) => setNotification({ type: 'error', text: err.message })
    );

    return () => unsubscribe();
  }, [selectedGroup?.id]);

  // Email / Password Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setActionLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      } else {
        if (!formData.name.trim()) {
          setErrorMessage({ title: 'Name required', text: 'Please enter your full name or nickname.' });
          setActionLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setErrorMessage({ title: 'Weak Password', text: 'Password must be at least 6 characters.' });
          setActionLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        if (formData.name.trim()) {
          await updateProfile(userCredential.user, { displayName: formData.name.trim() });
        }
      }
      setFormData({ name: '', email: '', password: '' });
    } catch (err) {
      console.error("Auth error:", err);
      handleAuthError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setActionLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Auth error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        handleAuthError(err);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Map Firebase error codes to friendly UI messages
  const handleAuthError = (err) => {
    const currentDomain = window.location.hostname;
    if (err.code === 'auth/unauthorized-domain') {
      setErrorMessage({
        isUnauthorizedDomain: true,
        title: 'Unauthorized Domain in Firebase',
        text: `Firebase blocks sign-ins from unrecognized domains. You need to add "${currentDomain}" to your Firebase Console.`,
        domain: currentDomain
      });
    } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      setErrorMessage({
        title: 'Invalid Credentials',
        text: 'Incorrect email address or password. Please try again.'
      });
    } else if (err.code === 'auth/email-already-in-use') {
      setErrorMessage({
        title: 'Account Already Exists',
        text: 'An account with this email already exists. Switch to "Sign In" to log in.'
      });
    } else if (err.code === 'auth/weak-password') {
      setErrorMessage({
        title: 'Weak Password',
        text: 'Password should be at least 6 characters long.'
      });
    } else if (err.code === 'auth/invalid-email') {
      setErrorMessage({
        title: 'Invalid Email',
        text: 'Please enter a valid email format (e.g. name@example.com).'
      });
    } else if (err.code === 'auth/network-request-failed') {
      setErrorMessage({
        title: 'Network Error',
        text: 'Unable to connect to Firebase. Please check your internet connection.'
      });
    } else {
      setErrorMessage({
        title: 'Authentication Error',
        text: err.message || 'An unexpected error occurred. Please try again.'
      });
    }
  };

  const copyDomainToClipboard = (domain) => {
    navigator.clipboard.writeText(domain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedGroup(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupData.name.trim() || !user) return;

    try {
      const defaultMemberName = user.displayName || user.email?.split('@')[0] || 'You';
      await createGroup(user.uid, {
        name: groupData.name.trim(),
        baseCurrency: groupData.baseCurrency,
        members: [defaultMemberName]
      });
      setGroupData({ name: '', baseCurrency: 'USD' });
      setNotification({ type: 'success', text: 'Group created successfully!' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to create group: ' + err.message });
    }
  };

  // Delete Group
  const handleGroupDelete = async () => {
    if (!selectedGroup) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedGroup.name}"?`)) return;

    try {
      await deleteGroup(selectedGroup.id);
      setSelectedGroup(null);
      setExpenses([]);
      setNotification({ type: 'success', text: 'Group deleted.' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to delete group: ' + err.message });
    }
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    const memberName = newMember.trim();
    if (!memberName || !selectedGroup) return;

    if (selectedGroup.members?.includes(memberName)) {
      setNotification({ type: 'error', text: `"${memberName}" is already a member.` });
      return;
    }

    try {
      await addMemberToGroup(selectedGroup.id, memberName);
      setNewMember('');
      setNotification({ type: 'success', text: `Added ${memberName} to group.` });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to add member: ' + err.message });
    }
  };

  // Add Expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !expenseForm.description || !expenseForm.amount) return;

    try {
      const payer = expenseForm.paidBy || selectedGroup.members?.[0] || 'You';
      await addExpense(selectedGroup.id, {
        description: expenseForm.description.trim(),
        amount: expenseForm.amount,
        currency: expenseForm.currency,
        paidBy: payer,
        splitWith: selectedGroup.members || [payer]
      });

      setShowExpenseForm(false);
      setExpenseForm({ 
        description: '', 
        amount: '', 
        currency: selectedGroup.baseCurrency || 'USD', 
        paidBy: selectedGroup.members?.[0] || '' 
      });
      setNotification({ type: 'success', text: 'Expense recorded & split equally!' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to save expense: ' + err.message });
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId) => {
    if (!selectedGroup) return;
    try {
      await deleteExpense(selectedGroup.id, expenseId);
      setNotification({ type: 'success', text: 'Expense removed.' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to delete expense: ' + err.message });
    }
  };

  // Settle All Debts
  const handleSettleDebts = async (bal) => {
    if (!selectedGroup) return;
    const confirmText = bal 
      ? `Mark settlement: ${bal.from} paid ${bal.to} ${bal.amount} ${bal.currency}?` 
      : 'Settle all debts for this group?';

    if (!window.confirm(confirmText)) return;

    try {
      await settleAllDebts(selectedGroup.id);
      setNotification({ type: 'success', text: '🎉 All debts settled!' });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', text: 'Failed to settle debts: ' + err.message });
    }
  };

  const groupMembers = selectedGroup?.members || ['You'];
  const balances = selectedGroup 
    ? simplifyDebts(expenses, groupMembers, selectedGroup.baseCurrency || 'USD')
    : [];

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading BillSplitter...</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     VIEW 1: Group Detail View (Logged In)
     ═══════════════════════════════════════════ */
  if (user && selectedGroup) {
    return (
      <div className="app-container">
        {notification && (
          <div className={`toast-notification toast-${notification.type}`}>
            {notification.text}
          </div>
        )}

        <div className="detail-panel">
          <div className="detail-topbar">
            <button
              onClick={() => {
                setSelectedGroup(null);
                setExpenses([]);
              }}
              className="btn-back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Dashboard
            </button>
            <button onClick={handleGroupDelete} className="btn-danger-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete Group
            </button>
          </div>

          <div className="detail-header-card">
            <div className="detail-header-info">
              <span className="currency-pill">{selectedGroup.baseCurrency} Base</span>
              <h1 className="detail-title">{selectedGroup.name}</h1>
              <p className="detail-subtitle">{groupMembers.length} Members involved in splitting</p>
            </div>
          </div>

          {/* Members Section */}
          <div className="members-card">
            <div className="members-header">
              <h3 className="section-label">Group Members</h3>
              <span className="count-badge">{groupMembers.length}</span>
            </div>
            <div className="members-wrap">
              {groupMembers.map((m, i) => (
                <div key={i} className="member-chip">
                  <div className="member-avatar">{m.charAt(0).toUpperCase()}</div>
                  <span>{m}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddMember} className="member-add-form">
              <input
                type="text"
                placeholder="Add friend by name (e.g. Maya, Sam)"
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
                required
              />
              <button type="submit" className="btn-accent-sm">
                + Add Member
              </button>
            </form>
          </div>

          {/* Content Grid: Expenses + Balances */}
          <div className="content-grid">
            {/* Expenses Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Expenses</h3>
                  <p className="card-subtitle">{expenses.length} recorded items</p>
                </div>
                <button
                  onClick={() => {
                    setShowExpenseForm(!showExpenseForm);
                    setExpenseForm({
                      description: '',
                      amount: '',
                      currency: selectedGroup.baseCurrency || 'USD',
                      paidBy: groupMembers[0] || ''
                    });
                  }}
                  className="btn-accent-sm"
                >
                  {showExpenseForm ? '✕ Close' : '+ Add Expense'}
                </button>
              </div>

              {showExpenseForm && (
                <form onSubmit={handleAddExpense} className="expense-form-card">
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Dinner at Bistro, Uber Ride, AirBnb"
                      value={expenseForm.description}
                      onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="expense-form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseForm.amount}
                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Currency</label>
                      <select
                        value={expenseForm.currency}
                        onChange={e => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Who Paid?</label>
                    <select
                      value={expenseForm.paidBy || groupMembers[0]}
                      onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                      required
                    >
                      {groupMembers.map(m => (
                        <option key={m} value={m}>{m} paid full amount</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn-primary btn-primary--block">
                    Save Expense (Split Among {groupMembers.length} Members)
                  </button>
                </form>
              )}

              {expenses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <p className="empty-title">No expenses yet</p>
                  <p className="empty-desc">Click "+ Add Expense" to start tracking bills.</p>
                </div>
              ) : (
                <ul className="expense-list">
                  {expenses.map(ex => (
                    <li key={ex.id} className="expense-row">
                      <div className="expense-info">
                        <div className="expense-name">{ex.description}</div>
                        <div className="expense-sub">
                          Paid by <strong className="highlight-payer">{ex.paidBy}</strong> • {ex.date}
                        </div>
                      </div>
                      <div className="expense-action-wrap">
                        <div className="expense-val">
                          {ex.amount} <span className="curr-tag">{ex.currency}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteExpense(ex.id)} 
                          className="btn-icon-del" 
                          title="Delete expense"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Balances Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Settlement Summary</h3>
                  <p className="card-subtitle">Optimized using greedy simplification</p>
                </div>
              </div>

              {balances.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✨</div>
                  <p className="empty-title">Everyone is settled up!</p>
                  <p className="empty-desc">All expenses are balanced with zero pending debts.</p>
                </div>
              ) : (
                <ul className="balance-list">
                  {balances.map((bal, idx) => (
                    <li key={idx} className="balance-row">
                      <div className="balance-names">
                        <span className="debtor">{bal.from}</span>
                        <span className="arrow-tag">pays</span>
                        <span className="creditor">{bal.to}</span>
                      </div>
                      <div className="balance-action">
                        <span className="balance-val">{bal.amount} {bal.currency}</span>
                        <button
                          className="btn-settle"
                          onClick={() => handleSettleDebts(bal)}
                        >
                          Settle
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     VIEW 2: Dashboard View (Logged In)
     ═══════════════════════════════════════════ */
  if (user) {
    return (
      <div className="app-container">
        {notification && (
          <div className={`toast-notification toast-${notification.type}`}>
            {notification.text}
          </div>
        )}

        <header className="navbar">
          <div className="navbar-brand">
            <div className="brand-icon">💰</div>
            <div>
              <span className="brand-title">BillSplitter</span>
              <span className="brand-tag">Cloud</span>
            </div>
          </div>

          <div className="user-profile-menu">
            <div className="user-avatar">
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-name">{user.displayName || 'Friend'}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout-clean">
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="create-group-hero">
            <div className="hero-text">
              <h2>Create a Group</h2>
              <p>Organize shared bills for roommates, weekend trips, or group dinners.</p>
            </div>

            <form onSubmit={handleCreateGroup} className="create-group-form">
              <input
                type="text"
                placeholder="Group Name (e.g. Lisbon Trip, Flat 4B, Friday Dinner)"
                value={groupData.name}
                onChange={e => setGroupData({ ...groupData, name: e.target.value })}
                required
              />
              <select
                value={groupData.baseCurrency}
                onChange={e => setGroupData({ ...groupData, baseCurrency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
              </select>
              <button type="submit" className="btn-primary">
                + Create Group
              </button>
            </form>
          </div>

          <div className="groups-section-header">
            <h3>Your Active Groups</h3>
            <span className="count-badge">{groups.length}</span>
          </div>

          {groups.length === 0 ? (
            <div className="empty-dashboard">
              <div className="empty-icon">👥</div>
              <p className="empty-title">No groups created yet</p>
              <p className="empty-desc">Create your first group above to start adding expenses and splitting costs.</p>
            </div>
          ) : (
            <div className="group-grid">
              {groups.map(g => (
                <div
                  key={g.id}
                  className="group-card-modern"
                  onClick={() => setSelectedGroup(g)}
                >
                  <div className="group-card-top">
                    <span className="group-curr-badge">{g.baseCurrency}</span>
                    <span className="group-member-count">{g.members?.length || 1} members</span>
                  </div>
                  <h4 className="group-card-name">{g.name}</h4>
                  <div className="group-card-bottom">
                    <span className="group-view-link">Open Group →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     VIEW 3: Redesigned State-of-the-Art Auth View
     ═══════════════════════════════════════════ */
  return (
    <div className="auth-ambient-wrap">
      {/* Background Decorative Glow Orbs */}
      <div className="glow-orb glow-orb--1"></div>
      <div className="glow-orb glow-orb--2"></div>
      <div className="glow-orb glow-orb--3"></div>

      <div className="auth-box-wrapper">
        <div className="auth-card-modern">
          {/* Header Branding */}
          <div className="auth-brand-head">
            <div className="brand-badge-icon">💰</div>
            <h1 className="auth-title">BillSplitter</h1>
            <p className="auth-subtitle">
              {isLogin 
                ? 'Welcome back! Sign in to access your shared expenses.' 
                : 'Create an account to start splitting expenses seamlessly.'}
            </p>
          </div>

          {/* Segmented Pill Tabs for Login vs Signup */}
          <div className="segmented-auth-toggle">
            <button 
              type="button"
              className={`toggle-tab ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`toggle-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setErrorMessage(null);
              }}
            >
              Create Account
            </button>
          </div>

          {/* Specialized Error / Unauthorized Domain Banner */}
          {errorMessage && (
            <div className="auth-error-banner">
              <div className="error-banner-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <strong>{errorMessage.title}</strong>
              </div>
              <p className="error-banner-text">{errorMessage.text}</p>
              
              {errorMessage.isUnauthorizedDomain && (
                <div className="domain-help-box">
                  <div className="domain-pill">
                    <code>{errorMessage.domain}</code>
                    <button 
                      type="button" 
                      onClick={() => copyDomainToClipboard(errorMessage.domain)} 
                      className="btn-copy-domain"
                    >
                      {copiedDomain ? '✓ Copied!' : 'Copy Domain'}
                    </button>
                  </div>
                  <p className="domain-help-steps">
                    <strong>Quick Fix:</strong> Open Firebase Console → Authentication → <strong>Settings</strong> tab → <strong>Authorized domains</strong> → Click <em>Add domain</em> and paste the copied domain.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Google Sign-in Button */}
          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            className="btn-google-modern"
            disabled={actionLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="modern-divider">
            <span>or use email</span>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="modern-auth-form">
            {!isLogin && (
              <div className="input-field-wrap">
                <label htmlFor="name">Full Name</label>
                <div className="input-with-icon">
                  <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="name"
                    type="text"
                    placeholder="Alex Johnson"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="input-field-wrap">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="input-field-wrap">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="btn-eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-submit-modern" 
              disabled={actionLoading}
            >
              {actionLoading ? (
                <span className="btn-loading-flex">
                  <span className="spinner-mini"></span>
                  Processing...
                </span>
              ) : (
                isLogin ? 'Sign In to Dashboard →' : 'Create Your Free Account →'
              )}
            </button>
          </form>

          {/* Features highlight footer */}
          <div className="auth-feature-pills">
            <span>⚡ Instant Live Sync</span>
            <span>•</span>
            <span>💱 Multi-Currency</span>
            <span>•</span>
            <span>🧠 Greedy Split</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
