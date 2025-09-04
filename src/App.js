// App.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import './App.css';

// <<<<<<< IMPORTANT: Make sure this URL matches your Render backend URL
const SERVER = process.env.REACT_APP_SERVER_URL || 'https://chaintask-backend.onrender.com'; 

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
  
    const fetchTasks = useCallback(async () => { /* ... unchanged ... */ }, [token, filters]);
    const createTask = async (e) => { /* ... unchanged ... */ };
    const shareTask = async (taskId, toAddress) => { /* ... unchanged ... */ };
    const connectWallet = async () => { /* ... unchanged ... */ };
    const disconnectWallet = async () => { /* ... unchanged ... */ };
  
    useEffect(() => { fetchTasks(); }, [fetchTasks]);
  
    const stats = { /* ... unchanged ... */ };
  
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
        {/* ... The rest of your dashboard JSX is unchanged ... */}
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