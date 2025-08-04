const Message = require("../models/message");
const Conversation = require("../models/conversation");
const { io, getReceiverSocketId } = require("../socket/socket");
const Admin = require("../models/Admin");

const sendMessage = async (req, res) => {
  try {
    const { message, receiverModel } = req.body;
    const { id: receiverId } = req.params;

    const isAdmin = !!req.admin; //resultat true connect Admin selon role (garage || expert || gestionnaire )
    const senderId = isAdmin ? req.admin._id : req.user._id;
    const senderModel = isAdmin ? "Admin" : "User";

    if (!message || !receiverId || !receiverModel) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    let conversation;
    conversation = await Conversation.findOne({
      participants: {
        $all: [
          {
            $elemMatch: {
              participantId: senderId,
              participantModel: senderModel,
            },
          },
          {
            $elemMatch: {
              participantId: receiverId,
              participantModel: receiverModel,
            },
          },
        ],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [
          { participantId: senderId, participantModel: senderModel },
          { participantId: receiverId, participantModel: receiverModel },
        ],
      });
    }

    const newMessage = new Message({
      senderId,
      senderModel,
      receiverId,
      receiverModel,
      message,
    });

    // Ajoute le message à la conversation
    conversation.messages.push(newMessage._id);

    await Promise.all([conversation.save(), newMessage.save()]);

    // Envoie le message à l'utilisateur via le socket, si l'utilisateur est en ligne
    const receiverSocketId = getReceiverSocketId(receiverId, receiverModel);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json({ result: conversation });
  } catch (error) {
    console.error("Erreur sendMessage :", error.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

const getMessages = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const otherUserModel = req.query.model;

    const isAdmin = !!req.admin;
    const senderId = isAdmin ? req.admin._id : req.user._id;
    const senderModel = isAdmin ? "Admin" : "User";

    const conversation = await Conversation.findOne({
      participants: {
        $all: [
          {
            $elemMatch: {
              participantId: senderId,
              participantModel: senderModel,
            },
          },
          {
            $elemMatch: {
              participantId: otherUserId,
              participantModel: otherUserModel,
            },
          },
        ],
      },
    }).populate("messages");

    if (!conversation) return res.status(200).json([]);

    res.status(200).json(conversation.messages);
  } catch (error) {
    console.error("Erreur getMessages :", error.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { receiverId } = req.body;
    const conversations = await Conversation.findOne({
      participants: {
        $all: [
          {
            $elemMatch: {
              participantId: receiverId,
              participantModel: "Admin",
            },
          },
          {
            $elemMatch: {
              participantId: userId,
              participantModel: "User",
            },
          },
        ],
      },
    }).populate("messages");

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Erreur getUserConversations :", error.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

const getUserConversationsByAdmin = async (req, res) => {
  try {
    const userId = req.params.userId;

    let findAdmin = await Admin.findById({ _id: req.admin._id });

    const conversations = await Conversation.findOne({
      participants: {
        $all: [
          {
            $elemMatch: {
              participantId: findAdmin?._id,
              participantModel: "Admin",
            },
          },
          {
            $elemMatch: {
              participantId: userId,
              participantModel: "User",
            },
          },
        ],
      },
    }).populate("messages");

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Erreur getUserConversationsByAdmin :", error.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUserConversations,
  getUserConversationsByAdmin,
};
