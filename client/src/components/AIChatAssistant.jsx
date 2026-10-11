import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { Bot, Send, X, Sparkles, CheckCircle2, ChevronDown, RotateCcw } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const QUICK_PROMPTS = [
    'How much did I spend this month?',
    'Check my budget status',
    'What are my top expenses?',
    'I spent ₹250 on coffee',
    'How can I save more this month?'
];

const AIChatAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm **FinAI**, your personal finance advisor. Ask me anything about your spending, budget, or tell me to log an expense (e.g., *'I spent ₹350 on groceries'*)."
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (messageText = null) => {
        const textToSend = (messageText || input).trim();
        if (!textToSend || loading) return;

        const newMessages = [...messages, { role: 'user', content: textToSend }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            // Build history payload (last 8 messages)
            const historyPayload = newMessages.slice(-8).map(m => ({
                role: m.role,
                content: m.content
            }));

            const { data } = await api.post('/api/ai-chat', {
                message: textToSend,
                history: historyPayload
            });

            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.reply,
                    action: data.actionExecuted
                }
            ]);
        } catch (err) {
            console.error('Chat Assistant Error:', err);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I ran into an error connecting to my AI service. Please try again in a moment.'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: "Chat cleared! How can I help you with your finances now?"
            }
        ]);
    };

    // Format markdown-like bold text simply without heavy dependencies
    const renderFormattedText = (text) => {
        if (!text) return '';
        const lines = text.split('\n');
        return lines.map((line, lIdx) => {
            // Replace **bold** with <strong>
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={lIdx} style={{ marginBottom: lIdx === lines.length - 1 ? 0 : '8px' }}>
                    {parts.map((part, pIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                        }
                        if (part.startsWith('*') && part.endsWith('*')) {
                            return <em key={pIdx}>{part.slice(1, -1)}</em>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: '28px',
                        right: '28px',
                        zIndex: 9999,
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Open FinAI Financial Assistant"
                >
                    <Sparkles size={26} />
                </button>
            )}

            {/* Chat Drawer / Modal */}
            {isOpen && (
                <div
                    className="glass-panel"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '390px',
                        maxWidth: 'calc(100vw - 32px)',
                        height: '560px',
                        maxHeight: 'calc(100vh - 48px)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '20px',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        background: 'rgba(15, 15, 24, 0.92)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1))',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Bot size={20} color="white" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    FinAI Assistant
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                                </h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Personal Financial Advisor</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                onClick={handleClearChat}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
                                title="Clear conversation"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Suggestions (Shown when only greeting exists) */}
                    {messages.length <= 2 && (
                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                            {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(prompt)}
                                    style={{
                                        fontSize: '0.75rem',
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        color: '#cbd5e1',
                                        padding: '5px 10px',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Messages Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '85%',
                                        padding: '12px 16px',
                                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))' : 'rgba(255, 255, 255, 0.06)',
                                        color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        border: msg.role === 'assistant' ? '1px solid var(--glass-border)' : 'none',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    {renderFormattedText(msg.content)}
                                </div>

                                {/* Transaction Creation Confirmation Banner */}
                                {msg.action?.type === 'transaction_created' && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '10px 14px',
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.85rem',
                                        color: 'var(--success)'
                                    }}>
                                        <CheckCircle2 size={16} />
                                        <span>Logged: <strong>{formatCurrency(msg.action.data.amount)}</strong> ({msg.action.data.category})</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '8px 12px' }}>
                                <Bot size={16} className="text-accent" />
                                <span>FinAI is thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Footer */}
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderTop: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask or command FinAI..."
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                            disabled={loading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: input.trim() ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: input.trim() ? 'pointer' : 'default',
                                transition: 'background 0.2s ease'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIChatAssistant;
