// =======================================================================
// ||           CHAIN-TASK FINAL FRONTEND APP (Refresh Fix)             ||
// =======================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';
import contractABI from './ChainTaskABI.json';

// --- 1. CONFIGURATION ---
const SOCKET_IO_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';

// CRITICAL: Replace this with the address of your deployed smart contract.
const CONTRACT_ADDRESS = "0xBA827f2618e251920d46E616C45A6Ae59546010C";

const socket = io(SOCKET_IO_URL);

// --- 2. SUB-COMPONENTS ---
const LoadingSpinner = () => (
    <div className="spinner-overlay">
        <div className="spinner"></div>
    </div>
);

// --- 3. MAIN APP COMPONENT ---
function App() {
    // --- STATE MANAGEMENT ---
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [walletAddress, setWalletAddress] = useState('');
    const [tasks, setTasks] = useState([]);
    const [contract, setContract] = useState(null);

    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskPriority, setTaskPriority] = useState('1');
    const [taskDueDate, setTaskDueDate] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [theme, setTheme] = useState('light');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isMining, setIsMining] = useState(false);

    // --- HELPER FUNCTIONS ---
    const getPriorityText = (priority) => {
        switch(priority.toString()) {
            case '2': return 'High';
            case '1': return 'Medium';
            case '0': return 'Low';
            default: return 'Medium';
        }
    };

    // --- BLOCKCHAIN & API INTERACTIONS ---
    const fetchTasks = useCallback(async (contractInstance) => {
        if (!contractInstance) return;
        try {
            const userTasks = await contractInstance.getTasks();
            const formattedTasks = userTasks.map(task => ({
                id: Number(task.id),
                title: task.title,
                description: task.description,
                priority: Number(task.priority),
                dueDate: Number(task.dueDate) * 1000,
                isDone: task.isDone
            }));
            setTasks(formattedTasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }, []);

    const connectWallet = useCallback(async () => {
        if (!window.ethereum) return alert('MetaMask is required to use this app!');
        try {
            const bnbTestnet = { name: "bnbt", chainId: 97, ensAddress: null };
            const web3Provider = new ethers.BrowserProvider(window.ethereum, bnbTestnet);
            await web3Provider.send("eth_requestAccounts", []);
            
            const web3Signer = await web3Provider.getSigner();
            const address = await web3Signer.getAddress();
            const todoContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, web3Signer);
            
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/link-wallet`, 
                { walletAddress: address },
                { headers: { 'x-auth-token': token } }
            );

            setContract(todoContract);
            setWalletAddress(address);
            fetchTasks(todoContract);
            alert("Wallet connected and linked to your account successfully!");
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert(error.response?.data?.msg || "Failed to connect wallet. See console for details.");
        }
    }, [fetchTasks]);

    // --- USE EFFECT HOOKS ---
    useEffect(() => {
        const initializeApp = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            setIsAuthenticated(true);
            setUsername(localStorage.getItem('username'));

            if (!window.ethereum) {
                setIsLoading(false);
                return;
            }

            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    console.log("Found connected wallet. Re-initializing session...");
                    const bnbTestnet = { name: "bnbt", chainId: 97, ensAddress: null };
                    const web3Provider = new ethers.BrowserProvider(window.ethereum, bnbTestnet);
                    const web3Signer = await web3Provider.getSigner();
                    const address = await web3Signer.getAddress();
                    const todoContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, web3Signer);
                    
                    setContract(todoContract);
                    setWalletAddress(address);
                    await fetchTasks(todoContract);
                }
            } catch (error) {
                console.error("Could not re-initialize wallet connection:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, [fetchTasks]);

    useEffect(() => {
        const syncPendingTasks = () => { /* Placeholder */ };
        socket.on('tasks changed', () => { if (contract) fetchTasks(contract); });
        const handleOnline = () => { setIsOnline(true); syncPendingTasks(); };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            socket.off('tasks changed');
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [contract, fetchTasks]);

    // --- EVENT HANDLERS ---
    const handleAuth = async (e) => {
        e.preventDefault();
        const url = isLoginView ? `${API_URL}/login` : `${API_URL}/register`;
        const payload = isLoginView ? { email, password } : { username, email, password };
        try {
            const { data } = await axios.post(url, payload);
            if (isLoginView) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                setUsername(data.username);
                setIsAuthenticated(true);
            } else {
                alert('Registration successful! Please login.');
                setIsLoginView(true);
            }
        } catch (error) {
            alert(error.response?.data?.msg || 'Authentication failed.');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        setIsAuthenticated(false);
        setWalletAddress('');
        setTasks([]);
        setContract(null);
    };

    const addTask = async (e) => {
        e.preventDefault();
        if (!taskTitle || !contract) return;
        setIsMining(true);
        try {
            const dueDateTimestamp = taskDueDate ? new Date(taskDueDate).getTime() / 1000 : 0;
            const tx = await contract.createTask(taskTitle, taskDesc, taskPriority, dueDateTimestamp);
            const bscScanUrl = `https://testnet.bscscan.com/tx/${tx.hash}`;
            alert(`Task creation sent!\n\nTransaction Hash: ${tx.hash}\n\nYou can view its status on BSCScan:\n${bscScanUrl}`);
            await tx.wait();
            socket.emit('task updated');
            setTaskTitle(''); setTaskDesc(''); setTaskPriority('1'); setTaskDueDate('');
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Failed to add task. The transaction may have been rejected.");
        } finally {
            setIsMining(false);
        }
    };
    
    const toggleTaskStatus = async (id) => {
        if (!contract) return;
        setIsMining(true);
        try {
            const tx = await contract.toggleTaskStatus(id);
            const bscScanUrl = `https://testnet.bscscan.com/tx/${tx.hash}`;
            alert(`Task update sent!\n\nTransaction Hash: ${tx.hash}\n\nYou can view its status on BSCScan:\n${bscScanUrl}`);
            await tx.wait();
            socket.emit('task updated');
        } catch (error) { console.error("Error toggling task status:", error); } 
        finally { setIsMining(false); }
    };

    const deleteTask = async (id) => {
        if (!contract) return;
        setIsMining(true);
        try {
            const tx = await contract.deleteTask(id);
            const bscScanUrl = `https://testnet.bscscan.com/tx/${tx.hash}`;
            alert(`Task deletion sent!\n\nTransaction Hash: ${tx.hash}\n\nYou can view its status on BSCScan:\n${bscScanUrl}`);
            await tx.wait();
            socket.emit('task updated');
        } catch (error) { console.error("Error deleting task:", error); } 
        finally { setIsMining(false); }
    };

    const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light');

    // --- RENDER LOGIC ---
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = filterPriority === 'all' || task.priority.toString() === filterPriority;
        return matchesSearch && matchesPriority;
    });
    
    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return (
            <div className={`auth-container ${theme}`}>
                <div className="auth-form">
                    <h2>{isLoginView ? 'Welcome Back!' : 'Create Account'}</h2>
                    <form onSubmit={handleAuth}>
                        {!isLoginView && <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />}
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                        <button type="submit">{isLoginView ? 'Login' : 'Register'}</button>
                    </form>
                    <button className="toggle-auth" type="button" onClick={() => setIsLoginView(!isLoginView)}>
                        {isLoginView ? 'Need an account? Register' : 'Have an account? Login'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`App ${theme}`}>
            {isMining && <LoadingSpinner />}
            <header className="app-header">
                <h1>ChainTask</h1>
                <div className="header-controls">
                    <span>Welcome, {username}</span>
                    <button className="theme-switcher" onClick={toggleTheme} title="Toggle Theme">{theme === 'light' ? '🌙' : '☀️'}</button>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </header>
            
            {!walletAddress ? (
                <section className="wallet-controls">
                    <h2>Please Connect Your Wallet</h2>
                    <p>Link your MetaMask wallet to start managing your tasks on the blockchain.</p>
                    <button className="connect-wallet-btn" onClick={connectWallet}>Connect Wallet</button>
                </section>
            ) : (
                <>
                    <div className="wallet-info">
                        Connected Wallet: <span>{walletAddress}</span>
                    </div>
                    {!isOnline && <p style={{color: 'red', textAlign: 'center'}}>You are offline. Changes will be synced later.</p>}
                    <section className="task-controls">
                        <form onSubmit={addTask} className="task-form">
                            <div className="form-group full-width">
                                <label>Task Title</label>
                                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="What needs to be done?" required />
                            </div>
                            <div className="form-group full-width">
                                <label>Description</label>
                                <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Add more details..."></textarea>
                            </div>
                            <div className="form-group">
                                <label>Priority</label>
                                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                                    <option value="2">High</option>
                                    <option value="1">Medium</option>
                                    <option value="0">Low</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Due Date</label>
                                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
                            </div>
                            <button type="submit" disabled={isMining}>
                                {isMining ? 'Processing...' : 'Add Task'}
                            </button>
                        </form>
                        <div className="filters">
                            <input type="text" placeholder="Search tasks..." onChange={e => setSearchTerm(e.target.value)} />
                            <select onChange={e => setFilterPriority(e.target.value)}>
                                <option value="all">All Priorities</option>
                                <option value="2">High</option>
                                <option value="1">Medium</option>
                                <option value="0">Low</option>
                            </select>
                        </div>
                    </section>
                    <section className="task-list">
                        {tasks.length > 0 ? (
                            filteredTasks.map(task => (
                                <div key={task.id} className={`task-card ${task.isDone ? 'completed' : ''}`}>
                                    <div className="task-header">
                                        <h3>{task.title}</h3>
                                        <span className={`priority-tag ${getPriorityText(task.priority).toLowerCase()}`}>{getPriorityText(task.priority)}</span>
                                    </div>
                                    <p>{task.description}</p>
                                    <div className="task-footer">
                                        <span className="due-date">
                                            {task.dueDate > 0 ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                                        </span>
                                        <div className="task-actions">
                                            <button onClick={() => toggleTaskStatus(task.id)} title={task.isDone ? 'Mark as Incomplete' : 'Mark as Complete'}>
                                                {task.isDone ? '↩️' : '✅'}
                                            </button>
                                            <button onClick={() => deleteTask(task.id)} title="Delete Task">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-tasks">
                                <h3>Your task list is empty!</h3>
                                <p>Add a new task above to get started.</p>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default App;