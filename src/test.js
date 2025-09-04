// src/App.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

// ====== UPDATE THIS ======
const SERVER_URL = 'http://localhost:5001';
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || "0xYourDeployedAddress";

// ABI must match server.js / your contract
const contractABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  {
    "anonymous": false, "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "content", "type": "string" },
      { "indexed": false, "internalType": "bool", "name": "completed", "type": "bool" },
      { "indexed": false, "internalType": "address", "name": "owner", "type": "address" }
    ], "name": "TaskCreated", "type": "event"
  },
  {
    "anonymous": false, "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "completed", "type": "bool" }
    ], "name": "TaskCompleted", "type": "event"
  },
  {
    "anonymous": false, "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "owner", "type": "address" }
    ], "name": "TaskDeleted", "type": "event"
  },
  {
    "anonymous": false, "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "content", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "owner", "type": "address" }
    ], "name": "TaskEdited", "type": "event"
  },
  {
    "anonymous": false, "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" }
    ], "name": "TaskTransferred", "type": "event"
  },
  { "inputs": [{ "internalType": "string", "name": "_content", "type": "string" }], "name": "createTask", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }], "name": "deleteTask", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }, { "internalType": "string", "name": "_content", "type": "string" }], "name": "editTask", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "taskCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "tasks", "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "content", "type": "string" },
      { "internalType": "bool", "name": "completed", "type": "bool" },
      { "internalType": "address", "name": "owner", "type": "address" }
    ], "stateMutability": "view", "type": "function"
  },
  { "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }], "name": "toggleCompleted", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }, { "internalType": "address", "name": "_newOwner", "type": "address" }], "name": "transferTask", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

const bscTestnetInfo = {
  chainId: '0x61',
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
};

// ============ Helpers ============
const Notification = ({ message, type, onDismiss }) => {
  if (!message) return null;
  return (
    <div className={`notification ${type}`}>
      {message}
      <button className="dismiss-btn" onClick={onDismiss}>×</button>
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`badge status ${status.replace(' ', '-').toLowerCase()}`}>{status}</span>
);
const PriorityBadge = ({ priority }) => (
  <span className={`badge priority ${priority.toLowerCase()}`}>{priority}</span>
);

// ============ Auth Forms ============
const Auth = ({ setToken, setUsername }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [notice, setNotice] = useState({ message: '', type: '' });

  const show = (m, t='success') => { setNotice({ message: m, type: t }); setTimeout(()=>setNotice({message:'', type:''}), 4000); };
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${SERVER_URL}/api/auth/register`, form);
      show('Registration successful. Please login.');
      setIsLogin(true);
    } catch (err) {
      show(err.response?.data?.msg || 'Registration failed', 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${SERVER_URL}/api/auth/login`, { email: form.email, password: form.password });
      setToken(res.data.token);
      setUsername(res.data.username);
      localStorage.setItem('token', res.data.token);
      show('Logged in!');
    } catch (err) {
      show(err.response?.data?.msg || 'Login failed', 'error');
    }
  };

  return (
    <div className="auth-container">
      <Notification message={notice.message} type={notice.type} onDismiss={()=>setNotice({message:'', type:''})}/>
      <div className="auth-card">
        <h2>{isLogin ? 'Login' : 'Create Account'}</h2>
        <form className="auth-form" onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <input type="text" name="username" placeholder="Username" value={form.username} onChange={onChange} required />
          )}
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={onChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={onChange} minLength={6} required />
          {!isLogin && (
            <input type="password" name="confirmPassword" placeholder="Confirm Password" value={form.confirmPassword} onChange={onChange} minLength={6} required />
          )}
          <button type="submit" className="auth-button">{isLogin ? 'Login' : 'Register'}</button>
        </form>
        <button className="toggle-form-button" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

// ============ Dashboard ============
const Dashboard = ({ token, setToken, username }) => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [editing, setEditing] = useState({ id: null, content: '' });
  const [loading, setLoading] = useState({ create: false, toggle: null, delete: null, edit: null, meta: null });
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Filters
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterTag, setFilterTag] = useState('');
  const [filterDue, setFilterDue] = useState('All'); // All, Overdue, Today, Upcoming

  const socket = useRef(null);
  const api = useMemo(() => axios.create({ baseURL: SERVER_URL, headers: { 'x-auth-token': token } }), [token]);

  const show = (m, t='success', ms=3500) => {
    setNotification({ message: m, type: t });
    setTimeout(()=>setNotification({ message:'', type:'' }), ms);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/api/tasks');
      setTasks(res.data || []);
    } catch (err) {
      console.error('Fetch tasks error:', err);
      show('Could not fetch tasks', 'error');
    }
  }, [api]);

  useEffect(() => { if (token) fetchTasks(); }, [token, fetchTasks]);

  useEffect(() => {
    if (token && account) {
      socket.current = io(SERVER_URL);
      socket.current.emit('join_room', account);
      socket.current.on('tasks_updated', fetchTasks);
      return () => socket.current && socket.current.disconnect();
    }
  }, [token, account, fetchTasks]);

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [bscTestnetInfo] });
    } catch {
      show('Failed to add/switch network', 'error');
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') return show('Please install MetaMask', 'error');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const current = await provider.getNetwork();
      if (current.chainId !== parseInt(bscTestnetInfo.chainId, 16)) {
        await switchNetwork();
      }

      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const c = new ethers.Contract(contractAddress, contractABI, signer);

      setAccount(accounts[0]);
      setContract(c);

      await api.post('/api/user/link-wallet', { walletAddress: accounts[0] });
      fetchTasks();
      show('Wallet connected!');
    } catch (err) {
      console.error(err);
      show('Failed to connect wallet', 'error');
    }
  };

  const handleTx = async (action, successMsg) => {
    try {
      const tx = await action();
      await tx.wait();
      show(successMsg);
    } catch (err) {
      console.error('Tx error:', err);
      show(err?.reason || 'Transaction failed or rejected', 'error');
    } finally {
      setLoading({ create: false, toggle: null, delete: null, edit: null, meta: null });
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!contract || !newTaskContent.trim()) return;
    setLoading((s) => ({ ...s, create: true }));
    await handleTx(() => contract.createTask(newTaskContent.trim()), 'Task created!');
    setNewTaskContent('');
  };

  const toggleCompleted = async (taskId, newCompleted) => {
    if (!contract) return;
    setLoading((s) => ({ ...s, toggle: taskId }));
    await handleTx(() => contract.toggleCompleted(taskId), 'Task status updated');
    // keep off-chain status aligned if completed
    if (newCompleted) {
      await api.patch(`/api/tasks/${taskId}/metadata`, { status: 'Completed' }).catch(()=>{});
    } else {
      await api.patch(`/api/tasks/${taskId}/metadata`, { status: 'Pending' }).catch(()=>{});
    }
  };

  const deleteTask = async (taskId) => {
    if (!contract) return;
    setLoading((s) => ({ ...s, delete: taskId }));
    await handleTx(() => contract.deleteTask(taskId), 'Task deleted');
  };

  const startEdit = (task) => setEditing({ id: task.taskId, content: task.content });
  const cancelEdit = () => setEditing({ id: null, content: '' });
  const saveEdit = async (taskId) => {
    if (!contract || !editing.content.trim()) return;
    setLoading((s) => ({ ...s, edit: taskId }));
    await handleTx(() => contract.editTask(taskId, editing.content.trim()), 'Task edited');
    cancelEdit();
  };

  // Off-chain metadata updates
  const updateMetadata = async (taskId, patch) => {
    setLoading((s) => ({ ...s, meta: taskId }));
    try {
      await api.patch(`/api/tasks/${taskId}/metadata`, patch);
      show('Updated');
    } catch (err) {
      console.error(err);
      show('Update failed', 'error');
    } finally {
      setLoading((s) => ({ ...s, meta: null }));
    }
  };

  // Filters & search
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return (tasks || []).filter(t => {
      if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
      if (filterTag && !(t.tags || []).some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()))) return false;

      if (filterDue !== 'All') {
        const dd = t.dueDate ? new Date(t.dueDate) : null;
        if (filterDue === 'Overdue' && (!dd || dd >= new Date(now.toDateString()))) return false;
        if (filterDue === 'Today' && (!dd || dd.toDateString() !== now.toDateString())) return false;
        if (filterDue === 'Upcoming' && (!dd || dd <= new Date(now.toDateString()))) return false;
      }

      if (q) {
        const hay = `${t.content} ${(t.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, query, filterStatus, filterPriority, filterTag, filterDue]);

  const logout = () => { setToken(null); localStorage.removeItem('token'); if (socket.current) socket.current.disconnect(); };

  return (
    <div className="dashboard-container">
      <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })}/>
      <header className="App-header">
        <h1>Decentralized To-Do List</h1>
        <div className="header-right">
          <span className="hello">Hi, {username || 'user'}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
          {account ? (
            <p className="wallet-info">Connected: {`${account.substring(0, 6)}...${account.substring(38)}`}</p>
          ) : (
            <button onClick={connectWallet} className="connect-btn">Connect Wallet</button>
          )}
        </div>
      </header>

      <main>
        {!account && <p className="connect-prompt">Please connect your wallet to manage your tasks.</p>}

        {account && (
          <>
            {/* Create */}
            <form onSubmit={createTask} className="task-form">
              <input type="text" value={newTaskContent} onChange={(e) => setNewTaskContent(e.target.value)} placeholder="Enter a new task..." required />
              <button type="submit" disabled={loading.create}>{loading.create ? 'Adding...' : 'Add Task'}</button>
            </form>

            {/* Filters */}
            <div className="filters">
              <input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
                <option>All</option>
                <option>Pending</option>
                <option>Completed</option>
                <option>On Hold</option>
                <option>Postponed</option>
              </select>
              <select value={filterPriority} onChange={(e)=>setFilterPriority(e.target.value)}>
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <input placeholder="Tag filter" value={filterTag} onChange={(e)=>setFilterTag(e.target.value)} />
              <select value={filterDue} onChange={(e)=>setFilterDue(e.target.value)}>
                <option>All</option>
                <option>Overdue</option>
                <option>Today</option>
                <option>Upcoming</option>
              </select>
            </div>

            {/* List */}
            <div className="task-list">
              {filteredTasks.length ? filteredTasks.map(task => {
                const isEditing = editing.id === task.taskId;
                const dueISO = task.dueDate ? new Date(task.dueDate).toISOString().slice(0,10) : '';
                const completedToggleTarget = !task.completed;

                return (
                  <div key={task.taskId} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-main">
                      {isEditing ? (
                        <input className="edit-input" value={editing.content} onChange={(e)=>setEditing({...editing, content: e.target.value})}/>
                      ) : (
                        <span className="task-content">{task.content}</span>
                      )}
                      <div className="badges">
                        <StatusBadge status={task.status || 'Pending'} />
                        <PriorityBadge priority={task.priority || 'Medium'} />
                        {task.dueDate && <span className="badge due">Due: {dueISO}</span>}
                        {(task.tags || []).map((t, idx) => <span key={idx} className="badge tag">#{t}</span>)}
                      </div>
                    </div>

                    <div className="task-actions">
                      {isEditing ? (
                        <>
                          <button className="btn save" disabled={loading.edit === task.taskId} onClick={()=>saveEdit(task.taskId)}>{loading.edit === task.taskId ? '...' : 'Save'}</button>
                          <button className="btn cancel" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn" disabled={loading.toggle === task.taskId} onClick={()=>toggleCompleted(task.taskId, completedToggleTarget)}>
                            {loading.toggle === task.taskId ? '...' : (task.completed ? 'Mark Pending' : 'Complete')}
                          </button>
                          <button className="btn" onClick={()=>startEdit(task)}>Edit</button>
                          <button className="btn warn" disabled={loading.delete === task.taskId} onClick={()=>deleteTask(task.taskId)}>
                            {loading.delete === task.taskId ? '...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="meta-row">
                      <label>
                        Due Date:
                        <input type="date" value={dueISO} onChange={(e)=>updateMetadata(task.taskId, { dueDate: e.target.value || null })} disabled={loading.meta === task.taskId}/>
                      </label>
                      <label>
                        Status:
                        <select value={task.status || 'Pending'} onChange={(e)=>updateMetadata(task.taskId, { status: e.target.value })} disabled={loading.meta === task.taskId}>
                          <option>Pending</option>
                          <option>Completed</option>
                          <option>On Hold</option>
                          <option>Postponed</option>
                        </select>
                      </label>
                      <label>
                        Priority:
                        <select value={task.priority || 'Medium'} onChange={(e)=>updateMetadata(task.taskId, { priority: e.target.value })} disabled={loading.meta === task.taskId}>
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </label>
                      <label className="tags-field">
                        Tags (comma):
                        <input type="text" defaultValue={(task.tags || []).join(', ')} onBlur={(e)=>updateMetadata(task.taskId, { tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} disabled={loading.meta === task.taskId}/>
                      </label>

                      {/* Quick actions */}
                      <div className="quick-actions">
                        <button className="btn ghost" onClick={()=>updateMetadata(task.taskId, { status: 'On Hold' })}>Hold</button>
                        <button className="btn ghost" onClick={()=>{
                          const next = task.dueDate ? new Date(task.dueDate) : new Date();
                          next.setDate(next.getDate() + 1);
                          updateMetadata(task.taskId, { status: 'Postponed', dueDate: next.toISOString().slice(0,10) });
                        }}>Postpone +1d</button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p>No tasks match your filters. Add one!</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// ============ App Root ============
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');

  return (
    <>
      {token ? (
        <Dashboard token={token} setToken={setToken} username={username} />
      ) : (
        <Auth setToken={setToken} setUsername={setUsername}/>
      )}
    </>
  );
}
