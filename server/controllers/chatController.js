/**
 * AI Chatbot Controller (Gemini API)
 * ====================================
 * Provides AI-powered customer support using Google Gemini.
 * The chatbot has full context about the Neo-CNS courier system
 * and can answer questions about orders, deliveries, pricing, etc.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt that gives the AI full context about the courier app
const SYSTEM_PROMPT = `
You are the AI assistant for Neo-CNS courier system.

Pricing:
₹50 base + ₹0.9/km + ₹12/kg.

Order flow:
Pending → Confirmed → Picked Up → In Transit → Out for Delivery → Delivered.

Answer courier-related questions only.
Keep responses short and helpful.
`;

/**
 * POST /api/chat
 * Send a message to the AI chatbot
 */
const sendMessage = async (req, res, next) => {
    console.log("hi");
    try {
        const { message, history } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "Gemini API key not configured"
            });
        }

        // Use Gemini model with system instruction
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            }
        });

        // Build conversation history for context
        const chatHistory = [];

        // Add previous messages for context (if provided)
        if (history && Array.isArray(history)) {
            for (const msg of history) {
                chatHistory.push({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                });
            }
        }

        // Start chat with history
        const chat = model.startChat({
            history: chatHistory,
        });

        // Send message
        const result = await chat.sendMessage(message);
        const response = result.response.text();

        console.log(`💬 Chat: "${message.substring(0, 50)}..." → "${response.substring(0, 50)}..."`);

        res.json({
            success: true,
            reply: response
        });

    } catch (error) {
        console.error("❌ Chatbot error:", error.message);

        // Handle specific Gemini errors
        if (error.message?.includes("API_KEY")) {
            return res.status(500).json({
                success: false,
                message: "Invalid Gemini API key. Please check your configuration."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to get AI response. Please try again."
        });
    }
};

module.exports = { sendMessage };
