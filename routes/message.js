const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,

  getUserConversations,
  getUserConversationsByAdmin,
} = require("../controller/message");
const auth = require("../middleware/auth");

// ✅ Récupérer tous les messages entre l'utilisateur connecté et l'autre participant
// Exemple : GET /api/messages/65fd...123?model=Admin
router.get("/:id", auth, getMessages);

// ✅ Envoyer un message à un utilisateur ou un admin
//si admin sender senderModel"Admin"  idUser en params et receiverModel="User" 
//si user sender senderModel"User"  idAdmin params et receiverModel="Admin"
// Exemple : POST /api/messages/send/65fd...123  body: { message: "Hello", receiverModel: "User" }
router.post("/send/:id", auth, sendMessage);

router.post("/message/conversations", auth, getUserConversations);

router.get("/getConversationUser/:userId", auth, getUserConversationsByAdmin);

module.exports = router;
