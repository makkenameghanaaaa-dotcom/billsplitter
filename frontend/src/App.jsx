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
  onAuthStateChanged,
  isFirebaseConfigured
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
  const [isLogin, setIsLogin] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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
        // If currently viewing a group, update its reference
        if (selectedGroup) {
          const updated = fetchedGroups.find(g => g.id === selectedGroup.id);
          if (updated) setSelectedGroup(updated);
        }
      },
      (err) => setMessage(err.message)
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
      (err) => setMessage(err.message)
    );

    return () => unsubscribe();
  }, [selectedGroup?.id]);

  // Email / Password Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage(null);
    setActionLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (formData.name.trim()) {
          await updateProfile(userCredential.user, { displayName: formData.name.trim() });
        }
      }
      setFormData({ name: '', email: '', password: '' });
    } catch (err) {
      console.error(err);
      let errMsg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      }
      setMessage(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setMessage(null);
    setActionLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setMessage(err.message || 'Google sign-in failed.');
      }
    } finally {
      setActionLoading(false);
    }
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
    } catch (err) {
      console.error(err);
      setMessage('Failed to create group: ' + err.message);
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
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete group: ' + err.message);
    }
  };

  // Add Member to Current Group
  const handleAddMember = async (e) => {
    e.preventDefault();
    const memberName = newMember.trim();
    if (!memberName || !selectedGroup) return;

    if (selectedGroup.members?.includes(memberName)) {
      setMessage(`"${memberName}" is already a member of this group.`);
      return;
    }

    try {
      await addMemberToGroup(selectedGroup.id, memberName);
      setNewMember('');
    } catch (err) {
      console.error(err);
      setMessage('Failed to add member: ' + err.message);
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
    } catch (err) {
      console.error(err);
      setMessage('Failed to save expense: ' + err.message);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId) => {
    if (!selectedGroup) return;
    try {
      await deleteExpense(selectedGroup.id, expenseId);
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete expense: ' + err.message);
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
      setMessage('All balances have been settled!');
    } catch (err) {
      console.error(err);
      setMessage('Failed to settle debts: ' + err.message);
    }
  };

  // Calculate Debts using greedy balance simplification
  const groupMembers = selectedGroup?.members || ['You'];
  const balances = selectedGroup 
    ? simplifyDebts(expenses, groupMembers, selectedGroup.baseCurrency || 'USD')
    : [];

  if (authLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Loading BillSplitter...</div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     VIEW 1: Group Detail View (Logged In)
     ═══════════════════════════════════════════ */
  if (user && selectedGroup) {
    return (
      <div className="app-container">
        <div className="detail-panel">
          <div className="detail-topbar">
            <button
              onClick={() => {
                setSelectedGroup(null);
                setExpenses([]);
              }}
              className="btn-text"
            >
              ← Back to Dashboard
            </button>
            <button onClick={handleGroupDelete} className="btn-danger">
              Delete Group
            </button>
          </div>

          <div className="detail-header">
            <div>
              <h1 className="detail-title">{selectedGroup.name}</h1>
              <p className="detail-subtitle">{groupMembers.length} Members</p>
            </div>
            <span className="badge">{selectedGroup.baseCurrency} Base</span>
          </div>

          {/* Members Section */}
          <div className="members-section">
            <h3 className="members-label">Group Members</h3>
            <div className="members-list">
              {groupMembers.map((m, i) => (
                <span key={i} className="member-badge">{m}</span>
              ))}
            </div>
            <form onSubmit={handleAddMember} className="member-form">
              <input
                type="text"
                placeholder="Friend's Name"
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary btn-primary--small">Add Member</button>
            </form>
          </div>

          {/* Content Grid: Expenses + Balances */}
          <div className="content-grid">
            {/* Expenses Card */}
            <div className="card">
              <div className="card-header">
                <h3>Expenses ({expenses.length})</h3>
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
                  className="btn-ghost"
                >
                  {showExpenseForm ? 'Cancel' : '+ Add Expense'}
                </button>
              </div>

              {showExpenseForm && (
                <form onSubmit={handleAddExpense} className="expense-form">
                  <input
                    type="text"
                    placeholder="Description (e.g. Dinner, Hotel, Taxi)"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required
                  />
                  <div className="expense-form-row">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      required
                    />
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
                  <select
                    value={expenseForm.paidBy || groupMembers[0]}
                    onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                    required
                  >
                    <option value="" disabled>Who paid?</option>
                    {groupMembers.map(m => (
                      <option key={m} value={m}>{m} paid</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary btn-primary--block">
                    Save & Split Equally
                  </button>
                </form>
              )}

              {expenses.length === 0 ? (
                <div className="empty-state">No expenses recorded yet. Click "+ Add Expense" above!</div>
              ) : (
                <ul className="list-reset">
                  {expenses.map(ex => (
                    <li key={ex.id} className="expense-item">
                      <div>
                        <div className="expense-desc">{ex.description}</div>
                        <div className="expense-meta">Paid by {ex.paidBy} • {ex.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="expense-amount">{ex.amount} {ex.currency}</div>
                        <button 
                          onClick={() => handleDeleteExpense(ex.id)} 
                          className="btn-text" 
                          style={{ color: '#ef4444', fontSize: '0.85rem' }}
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
              <h3>Settlement Balances</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Real-time debt simplification across currencies.
              </p>
              {balances.length === 0 ? (
                <div className="empty-state">🎉 Everyone is settled up!</div>
              ) : (
                <ul className="list-reset">
                  {balances.map((bal, idx) => (
                    <li key={idx} className="balance-item">
                      <div className="balance-names">
                        <strong>{bal.from}</strong> owes <strong>{bal.to}</strong>
                      </div>
                      <span className="balance-amount">{bal.amount} {bal.currency}</span>
                      <button
                        className="btn-success"
                        onClick={() => handleSettleDebts(bal)}
                      >
                        Settle
                      </button>
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
        <nav className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className="navbar-logo">💰 BillSplitter</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {user.displayName || user.email}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </nav>

        <div className="dashboard">
          <div className="create-card">
            <h3>Start a New Group</h3>
            <form onSubmit={handleCreateGroup} className="form-inline">
              <input
                type="text"
                placeholder="Group Name (e.g. Goa Trip, Apartment Rent, Dinner)"
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
              <button type="submit" className="btn-primary">Create Group</button>
            </form>
          </div>

          <h2 className="section-title">Your Groups</h2>
          <div className="group-grid">
            {groups.length === 0 ? (
              <p className="empty-text">No groups found yet. Create your first group above!</p>
            ) : (
              groups.map(g => (
                <div
                  key={g.id}
                  className="group-item"
                  onClick={() => setSelectedGroup(g)}
                >
                  <h3>{g.name}</h3>
                  <p>Base Currency: {g.baseCurrency}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {g.members?.length || 1} members
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     VIEW 3: Auth View (Sign In / Sign Up)
     ═══════════════════════════════════════════ */
  return (
    <div className="app-container auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-logo">💰 BillSplitter</h1>
        <p className="auth-tagline">Split expenses, not friendships.</p>

        {message && <div className="auth-alert">{message}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                id="name"
                type="text"
                placeholder="Alex Johnson"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="alex@example.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-primary--block" disabled={actionLoading}>
            {actionLoading ? 'Please wait...' : (isLogin ? 'Log In' : 'Create Account')}
          </button>

          <div className="auth-switch">
            <span className="auth-switch-text">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage(null);
              }}
              className="auth-switch-btn"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </form>

        <div className="auth-divider">OR</div>

        <div className="auth-google-wrap">
          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            className="btn-google"
            disabled={actionLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
