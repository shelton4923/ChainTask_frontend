// App.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import './App.css';

// <<<<<<< IMPORTANT: Make sure this URL matches your Render backend URL

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://chaintask-backend.onrender.com/api'
  : 'http://localhost:5001/api';

const contractABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "enum TodoList.Status",
          "name": "status",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "TaskCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "TaskDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "TaskEdited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum TodoList.Status",
          "name": "status",
          "type": "uint8"
        }
      ],
      "name": "TaskStatusChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        }
      ],
      "name": "TaskTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        },
        {
          "internalType": "enum TodoList.Status",
          "name": "_status",
          "type": "uint8"
        }
      ],
      "name": "changeStatus",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_content",
          "type": "string"
        }
      ],
      "name": "createTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "deleteTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "_content",
          "type": "string"
        }
      ],
      "name": "editTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "taskCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "tasks",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "content",
          "type": "string"
        },
        {
          "internalType": "enum TodoList.Status",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_newOwner",
          "type": "address"
        }
      ],
      "name": "transferTask",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
const contractAddress = "0x52596AB3C9d3eA596b46f18571Fe1d85388448a9"; // your deployed contract

async function getContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(contractAddress, contractABI, signer);
}

function Notification({ notif, onClose }) {
  if (!notif) return null;
  return (
    <div className={`notification ${notif.type || 'success'}`}>
      {notif.message}
      <button className="dismiss-btn" onClick={onClose}>×</button>
    </div>
  );
}

// =================================================================
// --- UPDATED AUTH COMPONENT ---
// =================================================================
function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  // <<<<<<< CHANGED: Simplified form state for email/password
  const [form, setForm] = useState({ email: '', password: '' });
  const [notif, setNotif] = useState(null);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${SERVER}/api/auth/register`, { email: form.email, password: form.password });
      setNotif({ type: 'success', message: res.data.msg });
      setIsLogin(true); // Switch to login form on successful registration
      setForm({ email: '', password: '' }); // Clear form
    } catch (err) {
      setNotif({ type: 'error', message: err.response?.data?.msg || 'Register failed' });
    }
  };

  const doLogin = async (e) => {
    e.preventDefault();
    try {
      // <<<<<<< CHANGED: Sending email and password
      const res = await axios.post(`${SERVER}/api/auth/login`, { email: form.email, password: form.password });
      const { token, userIdentifier, walletAddress } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('userIdentifier', userIdentifier); // Storing email as the identifier
      if (walletAddress) {
        localStorage.setItem('walletAddress', walletAddress);
      }
      onLogin(token, userIdentifier, walletAddress);
    } catch (err) {
      setNotif({ type: 'error', message: err.response?.data?.msg || 'Login failed' });
    }
  };

  return (
    <div className="auth-container">
      <Notification notif={notif} onClose={() => setNotif(null)} />
      <h1 className="app-title">ChainTask</h1>
      <form onSubmit={isLogin ? doLogin : doRegister} className="auth-form">
        {/* <<<<<<< CHANGED: Using email for both login and register */}
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={change} required />
        <button type="submit" className="btn primary">{isLogin ? "Login" : "Register"}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} className="btn switch">
        {isLogin ? "Need an account? Register" : "Already registered? Login"}
      </button>
    </div>
  );
}

function Dashboard({ token, userIdentifier, onLogout }) {
    // ... your entire Dashboard component code remains the same ...
    // Just make sure to display `userIdentifier` where you previously displayed `username`
    const [tasks, setTasks] = useState([]);
    const [form, setForm] = useState({ content: '', dueDate: '', category: '', priority: 'Medium', status: 'Pending', tags: '' });
    const [notif, setNotif] = useState(null);
    const [filters, setFilters] = useState({ status: '', priority: '', tag: '', category: '' });
    const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress'));
  
    const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${SERVER}/api/tasks`, {
        headers: { 'x-auth-token': token },
        params: filters
      });
      setTasks(res.data);
    } catch (err) {
      setNotif({ type: 'error', message: 'Fetch failed' });
    }
  }, [token, filters]);

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${SERVER}/api/tasks`, {
        ...form,
        tags: form.tags.split(',').map(t => t.trim())
      }, { headers: { 'x-auth-token': token } });
      setForm({ content: '', dueDate: '', category: '', priority: 'Medium', status: 'Pending', tags: '' });
      fetchTasks();
      setNotif({ type: 'success', message: 'Task created' });
    } catch {
      setNotif({ type: 'error', message: 'Task creation failed' });
    }
  };

  const shareTask = async (taskId, toAddress) => {
    try {
      const contract = await getContract();
      const tx = await contract.transferTask(taskId, toAddress);
      await tx.wait();
      setNotif({ type: 'success', message: 'Task transferred on blockchain!' });
    } catch (err) {
      setNotif({ type: 'error', message: 'Failed to transfer task' });
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
        return setNotif({ type: 'error', message: "MetaMask not found" });
    }
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const address = accounts[0];

        // Server-side validation
        const res = await axios.post(`${SERVER}/api/wallet/connect`, 
            { walletAddress: address },
            { headers: { 'x-auth-token': token } }
        );

        setWalletAddress(res.data.walletAddress);
        localStorage.setItem('walletAddress', res.data.walletAddress);
        setNotif({ type: 'success', message: `Wallet connected: ${address.slice(0,6)}...${address.slice(-4)}` });

    } catch (err) {
        setNotif({ type: 'error', message: err.response?.data?.msg || "Wallet connection failed" });
    }
  };

  const disconnectWallet = async () => {
    try {
        await axios.post(`${SERVER}/api/wallet/disconnect`, {}, { headers: { 'x-auth-token': token } });
        setWalletAddress(null);
        localStorage.removeItem('walletAddress');
        setNotif({ type: 'success', message: 'Wallet disconnected' });
    } catch (err) {
        setNotif({ type: 'error', message: 'Failed to disconnect wallet' });
    }
  };

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      pending: tasks.filter(t => t.status === 'Pending').length,
      high: tasks.filter(t => t.priority === 'High').length
    };
    return (
      <div className="dashboard">
        <Notification notif={notif} onClose={() => setNotif(null)} />
        <header className="dashboard-header">
           {/* <<<<<<< CHANGED: Displaying the user's email */}
          <h1 className="app-title">Welcome, {userIdentifier}</h1>
          <div className="header-actions">
            {walletAddress ? (
              <>
                <span className="wallet-text">Wallet: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</span>
                <button className="btn disconnect" onClick={disconnectWallet}>Disconnect</button>
              </>
            ) : (
              <button className="btn connect" onClick={connectWallet}>Connect Wallet</button>
            )}
            <button onClick={onLogout} className="btn danger">Logout</button>
          </div>
        </header>
              <div className="stats">
        <div className="stat-card">📌 Total: {stats.total}</div>
        <div className="stat-card">✅ Completed: {stats.completed}</div>
        <div className="stat-card">🕒 Pending: {stats.pending}</div>
        <div className="stat-card">🔥 High Priority: {stats.high}</div>
      </div>

      <form onSubmit={createTask} className="task-form">
        <input placeholder="Task content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <input placeholder="Category (e.g. Work, Personal)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Pending</option><option>Completed</option><option>On Hold</option><option>Postponed</option>
        </select>
        <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <button type="submit" className="btn primary">Add Task</button>
      </form>

      <div className="filters">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          <option>Pending</option><option>Completed</option><option>On Hold</option><option>Postponed</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priority</option>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
        <input placeholder="Search by Tag" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} />
        <input placeholder="Filter by Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
      </div>

      <div className="task-list">
        {tasks.length === 0 ? (
          <p className="empty-text">No tasks yet. Add one!</p>
        ) : (
          <ul>
            {tasks.map((t) => (
              <li key={t._id} className="task-item">
                <span>{t.content}</span>
                {t.dueDate && <small> ⏰ {new Date(t.dueDate).toLocaleDateString()}</small>}
                {t.category && <small> 📂 {t.category}</small>}
                <small> [{t.priority}] [{t.status}]</small>
                {t.tags.length > 0 && <small> 🏷 {t.tags.join(", ")}</small>}
                <button className="btn share" onClick={() => {
                  const addr = prompt("Enter recipient wallet address:");
                  if (addr) shareTask(t._id, addr);
                }}>🔗 Share</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  // <<<<<<< CHANGED: Renamed state for clarity. It now holds the email.
  const [userIdentifier, setUserIdentifier] = useState(localStorage.getItem('userIdentifier'));

  const handleLogin = (tok, user, wallet) => {
    setToken(tok);
    setUserIdentifier(user);
    if (wallet) {
      localStorage.setItem('walletAddress', wallet);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserIdentifier(null);
    localStorage.clear();
  };

  return token ? (
    <Dashboard token={token} userIdentifier={userIdentifier} onLogout={handleLogout} />
  ) : (
    <Auth onLogin={handleLogin} />
  );
}