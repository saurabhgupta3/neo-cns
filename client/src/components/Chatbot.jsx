import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./Chatbot.css";

const QUICK_QUESTIONS = [
    "How is pricing calculated?",
    "What payment methods are available?",
    "How does ETA prediction work?",
    "What is fraud detection?",
    "How do I track my order?"
];

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { authFetch, user } = useAuth();

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const sendMessage = async (text) => {
        const userMessage = text || input.trim();
        if (!userMessage || loading) return;

        // Add user message
        const newMessages = [...messages, { role: "user", content: userMessage }];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            // Build history for context (last 10 messages)
            const history = newMessages.slice(-3).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const res = await authFetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    history: history.slice(0, -1) // Don't include current message in history
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessages(prev => [...prev, { role: "bot", content: data.reply }]);
            } else {
                setMessages(prev => [...prev, {
                    role: "bot",
                    content: "Sorry, I couldn't process that. Please try again. 😅"
                }]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: "bot",
                content: "Connection error. Please check if the server is running."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Simple markdown to HTML (bold, lists)
    const formatMessage = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n- /g, "\n• ")
            .replace(/\n/g, "<br/>");
    };

    // Don't show chatbot if not logged in
    if (!user) return null;

    return (
        <>
            {/* Floating Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-icon">🤖</div>
                        <div className="chatbot-header-info">
                            <h4>Neo-CNS Assistant</h4>
                            <p>AI-powered support • Always online</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.length === 0 ? (
                            <div className="chat-welcome">
                                <div className="chat-welcome-icon">💬</div>
                                <h5>Hi {user?.name?.split(" ")[0] || "there"}! 👋</h5>
                                <p>I'm your AI assistant. Ask me anything about Neo-CNS courier service!</p>
                                <div className="chat-quick-actions">
                                    {QUICK_QUESTIONS.map((q, i) => (
                                        <button
                                            key={i}
                                            className="chat-chip"
                                            onClick={() => sendMessage(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`chat-message ${msg.role === "user" ? "user" : "bot"}`}
                                    dangerouslySetInnerHTML={
                                        msg.role === "bot"
                                            ? { __html: formatMessage(msg.content) }
                                            : undefined
                                    }
                                >
                                    {msg.role === "user" ? msg.content : undefined}
                                </div>
                            ))
                        )}

                        {/* Typing indicator */}
                        {loading && (
                            <div className="chat-typing">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chatbot-input">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || loading}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                className={`chatbot-toggle ${isOpen ? "active" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? "Close chat" : "Chat with AI"}
            >
                {isOpen ? "✕" : "💬"}
            </button>
        </>
    );
}
