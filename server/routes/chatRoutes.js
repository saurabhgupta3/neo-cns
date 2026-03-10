const express = require("express");
const router = express.Router();
const { sendMessage } = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");

// POST /api/chat - Send message to AI chatbot (requires login)
router.post("/", authenticate, sendMessage);

module.exports = router;
