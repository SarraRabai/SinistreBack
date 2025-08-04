const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {}; // Stocke la map entre l'utilisateur et son socketId

const getReceiverSocketId = (receiverId, receiverModel) => {
  return userSocketMap[`${receiverModel}:${receiverId}`];
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  const userModel = socket.handshake.query.userModel;

  if (userId && userModel) {
    const key = `${userModel}:${userId}`;
    userSocketMap[key] = socket.id;
    console.log("connected:", key, socket.id);
    io.emit("getOnlineUsers", Object.keys(userSocketMap)); // Met à jour la liste des utilisateurs en ligne
  }

  socket.on("disconnect", () => {
    const key = `${userModel}:${userId}`;
    delete userSocketMap[key];
    io.emit("getOnlineUsers", Object.keys(userSocketMap)); // Met à jour la liste des utilisateurs en ligne
  });
});

module.exports = {
  io,
  server,
  getReceiverSocketId,
};
