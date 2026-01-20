import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { Phone, PhoneOff, Zap, Shield, Globe, Settings, LogOut, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const vapi = new Vapi('84467ad3-a341-4406-b6f4-b8bf8b71a40c'); // Mock public key or retrieve from env

function App() {
    const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
    const [agentData, setAgentData] = useState(JSON.parse(localStorage.getItem('agentData')) || null);
    const [isConfigured, setIsConfigured] = useState(!!localStorage.getItem('userEmail'));
    const [callStatus, setCallStatus] = useState('idle');
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1aKPJS0mvuFduCpLzLAjjkG_BRGeK1tU1el_BwSABwn8/gviz/tq?tqx=out:csv&gid=0';

    useEffect(() => {
        const onCallStart = () => {
            console.log('Call started');
            setCallStatus('active');
        };
        const onCallEnd = () => {
            console.log('Call ended');
            setCallStatus('idle');
            setVolumeLevel(0);
        };
        const onVolume = (v) => setVolumeLevel(v);
        const onError = (e) => {
            console.error('Vapi Error:', e);
            setCallStatus('idle');
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('volume-level', onVolume);
        vapi.on('error', onError);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('volume-level', onVolume);
            vapi.off('error', onError);
        };
    }, []);

    const parseCSV = (csv) => {
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
        return lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
            return headers.reduce((obj, header, i) => {
                obj[header] = values[i];
                return obj;
            }, {});
        });
    };

    const handleConnect = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            const response = await fetch(SHEET_URL);
            const csvText = await response.text();
            const data = parseCSV(csvText);

            const user = data.find(row => row.Email?.toLowerCase() === email.trim().toLowerCase());

            if (user && user['Squad ID']) {
                localStorage.setItem('userEmail', email.trim());
                localStorage.setItem('agentData', JSON.stringify(user));
                setAgentData(user);
                setIsConfigured(true);
            } else {
                setErrorMsg('Email not found in our records. Please contact support.');
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setErrorMsg('Failed to sync with the database. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('agentData');
        setEmail('');
        setAgentData(null);
        setIsConfigured(false);
    };

    const toggleCall = async () => {
        if (callStatus === 'active' || callStatus === 'connecting') {
            setCallStatus('hanging-up');
            vapi.stop();
            return;
        }

        setCallStatus('connecting');
        try {
            console.log('Starting call with Squad:', agentData['Squad ID']);
            await vapi.start(undefined, undefined, agentData['Squad ID']);
        } catch (err) {
            console.error("Call failed:", err);
            setCallStatus('idle');
        }
    };

    if (!isConfigured) {
        return (
            <div className="setup-screen">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel setup-card"
                >
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            borderRadius: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem'
                        }}>
                            <Zap color="white" size={32} />
                        </div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Portal <span className="gradient-text">Sync</span></h1>
                        <p style={{ color: 'var(--text-muted)' }}>Enter your authorized email to access your calling portal.</p>
                    </div>

                    <form onSubmit={handleConnect}>
                        <input
                            type="email"
                            className="squad-input"
                            placeholder="e.g. test@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {errorMsg && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '1rem' }}>{errorMsg}</p>}
                        <button type="submit" className="primary-btn" disabled={isLoading}>
                            {isLoading ? 'Syncing...' : 'Access Portal'}
                        </button>
                    </form>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
                        Authorized access only. Logins are tracked via Future Theory.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="header">
                <div className="logo">
                    <Zap size={24} className="gradient-text" style={{ display: 'inline', marginRight: '8px' }} />
                    Future Theory- <span className="gradient-text">Voice Agents</span>
                </div>
                <nav className="nav-links">
                    <button onClick={handleDisconnect} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <LogOut size={16} /> Disconnect
                    </button>
                </nav>
            </header>

            <main className="portal-view">
                <div className="calling-hero">
                    <motion.div
                        animate={callStatus === 'active' ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="agent-visual"
                        style={{ borderRadius: '24px', overflow: 'hidden', background: 'var(--panel-bg)' }}
                    >
                        {callStatus === 'active' && <div className="pulse-ring"></div>}
                        <div className="agent-icon" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {agentData['Picture URL'] ? (
                                <img src={agentData['Picture URL']} alt="Brand" style={{ width: '80%', height: 'auto', objectFit: 'contain' }} />
                            ) : (
                                <Cpu size={80} color="white" />
                            )}
                        </div>
                    </motion.div>

                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                        {callStatus === 'active' ? 'Agent is Online' : (agentData['Company Name'] || 'Agent Ready')}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '400px' }}>
                        {callStatus === 'active'
                            ? 'Your Voice AI agent is currently engaged in a conversation.'
                            : `Welcome back, ${agentData['Name'] || 'User'}. Your portal is ready.`}
                    </p>

                    <button
                        className={`call-btn ${callStatus === 'active' || callStatus === 'hanging-up' ? 'active' : 'idle'}`}
                        onClick={toggleCall}
                        disabled={callStatus === 'connecting' || callStatus === 'hanging-up'}
                    >
                        {callStatus === 'connecting' ? (
                            'Initializing...'
                        ) : callStatus === 'hanging-up' ? (
                            'Hanging up...'
                        ) : callStatus === 'active' ? (
                            <><PhoneOff size={24} /> End Session</>
                        ) : (
                            <><Phone size={24} /> Start Conversation</>
                        )}
                    </button>

                    {callStatus === 'active' && (
                        <div className="volume-visual">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="volume-bar"
                                    style={{ height: `${10 + (volumeLevel * 100 * (i < 6 ? (i + 1) / 6 : (12 - i) / 6))}px` }}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '4rem' }}>
                    {[
                        { icon: <Shield size={24} />, title: "Secure Audio", desc: "End-to-end encrypted voice streaming." },
                        { icon: <Globe size={24} />, title: "Ultra Low Latency", desc: "Sub-500ms response times for natural flow." },
                        { icon: <Settings size={24} />, title: "Dynamic Logic", desc: "Real-time tool calling and data updates." }
                    ].map((feature, i) => (
                        <div key={i} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                            <div style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }}>{feature.icon}</div>
                            <h3 style={{ marginBottom: '0.5rem' }}>{feature.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{feature.desc}</p>
                        </div>
                    ))}
                </section>
            </main>

            <footer style={{ marginTop: 'auto', padding: '2rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Connected to Enterprise Relay v2.4.0
            </footer>
        </div>
    );
}

export default App;
