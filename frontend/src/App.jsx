import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLogin, setIsLogin] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [groups, setGroups] = useState([]);
  const [groupData, setGroupData] = useState({ name: '', baseCurrency: 'USD' });
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Simulated local state for the "everything at once" demo
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', currency: 'USD', paidBy: 'You' });
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const [members, setMembers] = useState(['You']);
  const [newMember, setNewMember] = useState('');

  useEffect(() => {
    if (token) {
      fetchGroups();
    }
  }, [token]);

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/api/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) { console.error(e); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      setMessage('Network error');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(groupData)
      });
      if (res.ok) {
        setGroupData({ name: '', baseCurrency: 'USD' });
        fetchGroups();
      }
    } catch (e) { console.error(e); }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const newExpense = { ...expenseForm, id: Date.now(), date: new Date().toLocaleDateString() };
    setExpenses([newExpense, ...expenses]);
    setShowExpenseForm(false);
    setExpenseForm({ description: '', amount: '', currency: 'USD', paidBy: members[0] });
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (newMember.trim() && !members.includes(newMember.trim())) {
      setMembers([...members, newMember.trim()]);
      setNewMember('');
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setSelectedGroup(null);
  };

  // Simple local simulation of the Balance Calculator
  const computeBalances = () => {
    // Record exact pairwise debts: owes[debtor][creditor] = amount
    let owes = {};
    members.forEach(m1 => {
      owes[m1] = {};
      members.forEach(m2 => owes[m1][m2] = 0);
    });

    expenses.forEach(ex => {
      let rate = ex.currency === selectedGroup.baseCurrency ? 1 :
        (ex.currency === 'EUR' ? 1.1 :
          ex.currency === 'GBP' ? 1.25 :
            ex.currency === 'INR' ? 0.012 : 0.8);

      const amountInBase = parseFloat(ex.amount) * rate;
      const splitAmount = amountInBase / members.length;

      const creditor = ex.paidBy;

      members.forEach(debtor => {
        if (debtor !== creditor) {
          owes[debtor][creditor] += splitAmount;
        }
      });
    });

    // Net the balances between each pair
    let result = [];
    let processed = new Set();

    members.forEach(m1 => {
      members.forEach(m2 => {
        if (m1 === m2) return;
        const pairId = [m1, m2].sort().join('-');
        if (processed.has(pairId)) return;

        const m1OwesM2 = owes[m1][m2];
        const m2OwesM1 = owes[m2][m1];

        if (m1OwesM2 > m2OwesM1) {
          const net = m1OwesM2 - m2OwesM1;
          if (net > 0.01) result.push({ from: m1, to: m2, amount: net.toFixed(2), currency: selectedGroup.baseCurrency });
        } else if (m2OwesM1 > m1OwesM2) {
          const net = m2OwesM1 - m1OwesM2;
          if (net > 0.01) result.push({ from: m2, to: m1, amount: net.toFixed(2), currency: selectedGroup.baseCurrency });
        }
        processed.add(pairId);
      });
    });

    return result;
  };

  const handleGroupDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${selectedGroup.name}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/groups/${selectedGroup.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedGroup(null);
        setExpenses([]);
        setMembers(['You']);
        fetchGroups();
      }
    } catch (e) { console.error(e); }
  };

  /* ═══════════════════════════════════════════
     RENDER: Group Detail View
     ═══════════════════════════════════════════ */
  if (token) {
    if (selectedGroup) {
      const balances = computeBalances();

      return (
        <div className="app-container">
          <div className="detail-panel">
            <div className="detail-topbar">
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setExpenses([]);
                  setMembers(['You']);
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
                <p className="detail-subtitle">{members.length} Members</p>
              </div>
              <span className="badge">{selectedGroup.baseCurrency} Base</span>
            </div>

            {/* Members Section */}
            <div className="members-section">
              <h3 className="members-label">Group Members</h3>
              <div className="members-list">
                {members.map((m, i) => (
                  <span key={i} className="member-badge">{m}</span>
                ))}
              </div>
              <form onSubmit={handleAddMember} className="member-form">
                <input
                  type="text"
                  placeholder="Friend's Name"
                  value={newMember}
                  onChange={e => setNewMember(e.target.value)}
                />
                <button type="submit" className="btn-primary btn-primary--small">Add Member</button>
              </form>
            </div>

            {/* Content Grid: Expenses + Balances */}
            <div className="content-grid">
              {/* Expenses Card */}
              <div className="card">
                <div className="card-header">
                  <h3>Expenses</h3>
                  <button
                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                    className="btn-ghost"
                  >
                    {showExpenseForm ? 'Cancel' : '+ Add'}
                  </button>
                </div>

                {showExpenseForm && (
                  <form onSubmit={handleAddExpense} className="expense-form">
                    <input
                      type="text"
                      placeholder="Description (e.g. Dinner)"
                      value={expenseForm.description}
                      onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      required
                    />
                    <div className="expense-form-row">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={expenseForm.amount}
                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        required
                      />
                      <select
                        value={expenseForm.currency}
                        onChange={e => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                    <select
                      value={expenseForm.paidBy}
                      onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                      required
                    >
                      <option value="" disabled>Who paid?</option>
                      {members.map(m => <option key={m} value={m}>{m} paid</option>)}
                    </select>
                    <button type="submit" className="btn-primary btn-primary--block">
                      Save Expense (Split Equally)
                    </button>
                  </form>
                )}

                {expenses.length === 0 ? (
                  <div className="empty-state">No expenses recorded yet.</div>
                ) : (
                  <ul className="list-reset">
                    {expenses.map(ex => (
                      <li key={ex.id} className="expense-item">
                        <div>
                          <div className="expense-desc">{ex.description}</div>
                          <div className="expense-meta">Paid by {ex.paidBy} on {ex.date}</div>
                        </div>
                        <div className="expense-amount">{ex.amount} {ex.currency}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Balances Card */}
              <div className="card">
                <h3>Settlement Balances</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                  Automatically simplified using the greedy algorithm.
                </p>
                {balances.length === 0 ? (
                  <div className="empty-state">Everyone is settled up!</div>
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
                          onClick={() => {
                            alert(`${bal.from} paid ${bal.to} ${bal.amount} ${bal.currency}!`);
                            setExpenses([]);
                          }}
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
       RENDER: Dashboard
       ═══════════════════════════════════════════ */
    return (
      <div className="app-container">
        <nav className="navbar">
          <h2 className="navbar-logo">BillSplitter</h2>
          <button onClick={logout} className="btn-logout">Logout</button>
        </nav>

        <div className="dashboard">
          <div className="create-card">
            <h3>Start a New Group</h3>
            <form onSubmit={handleCreateGroup} className="form-inline">
              <input
                type="text"
                placeholder="Group Name (e.g. Bali Trip)"
                value={groupData.name}
                onChange={e => setGroupData({ ...groupData, name: e.target.value })}
                required
              />
              <select
                value={groupData.baseCurrency}
                onChange={e => setGroupData({ ...groupData, baseCurrency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
                <option value="GBP">GBP</option>
              </select>
              <button type="submit" className="btn-primary">Create</button>
            </form>
          </div>

          <h2 className="section-title">Your Groups</h2>
          <div className="group-grid">
            {groups.length === 0 ? (
              <p className="empty-text">No groups found. Create one above!</p>
            ) : (
              groups.map(g => (
                <div
                  key={g.id}
                  className="group-item"
                  onClick={() => setSelectedGroup(g)}
                >
                  <h3>{g.name}</h3>
                  <p>Base Currency: {g.baseCurrency}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER: Auth (Login / Signup)
     ═══════════════════════════════════════════ */
  return (
    <div className="app-container auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-logo">BillSplitter</h1>
        <p className="auth-tagline">Split expenses, not friendships.</p>

        {message && <div className="error-msg">{message}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              autoComplete="off"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required={!isLogin}
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            autoComplete="off"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
              minLength="8"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
          <button type="submit" className="btn-primary btn-primary--large">
            {isLogin ? 'Log In' : 'Create Account'}
          </button>

          <div className="auth-switch">
            <span className="auth-switch-text">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setMessage(null); }}
              className="auth-switch-btn"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </form>

        <div className="auth-divider">OR</div>

        <div className="auth-google-wrap">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const res = await fetch(`${API_URL}/api/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: credentialResponse.credential })
                });
                const data = await res.json();
                if (res.ok) {
                  setToken(data.token);
                  localStorage.setItem('token', data.token);
                } else {
                  setMessage(data.error);
                }
              } catch (e) { setMessage('Google Login Failed'); }
            }}
            onError={() => setMessage('Google Login Failed')}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
