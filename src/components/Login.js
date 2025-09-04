import React, { useState } from 'react';
import axios from 'axios';


const Login = ({ setToken }) => {
    // --- State for all our fields ---
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // --- Client-side validation for registration ---
        if (!isLogin && password !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        try {
            if (isLogin) {
                // --- LOGIN LOGIC ---
                const loginPayload = { username, email, password };
                const res = await axios.post('http://localhost:5001/api/auth/login', loginPayload);
                setToken(res.data.token);
                localStorage.setItem('token', res.data.token);
            } else {
                // --- REGISTER LOGIC ---
                const registerPayload = { username, email, password };
                const res = await axios.post('http://localhost:5001/api/auth/register', registerPayload);
                setToken(res.data.token);
                localStorage.setItem('token', res.data.token);
            }
        } catch (err) {
            setError(err.response?.data?.msg || 'An error occurred. Is the server running?');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>{isLogin ? 'Login' : 'Create Account'}</h2>
                <form className="auth-form" onSubmit={handleSubmit}>
                    
                    {/* --- Username Field (always visible) --- */}
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    {/* --- Email Field (always visible) --- */}
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {/* --- Password Field (always visible) --- */}
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength="6"
                        required
                    />

                    {/* --- Confirm Password Field (only for registration) --- */}
                    {!isLogin && (
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            minLength="6"
                            required
                        />
                    )}

                    <button type="submit" className="auth-button">
                        {isLogin ? 'Login' : 'Register'}
                    </button>
                </form>

                {error && <p className="auth-error">{error}</p>}
                
                <button className="toggle-form-button" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                    {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
                </button>
            </div>
        </div>
    );
};

export default Login;