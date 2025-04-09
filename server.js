const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/users");

const app = express();
app.use(cors());
app.use(express.json());

// Connexion MongoDB locale
mongoose
  .connect("mongodb://127.0.0.1:27017/wizzme")
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

// Création du serveur HTTP
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: "*" },
});

// Utilisateurs connectés (temporaire)
const connectedUsers = {}; // socket.id => email

io.on("connection", (socket) => {
  console.log("🔌 Socket connecté :", socket.id);

  // Identification
  socket.on("set_identity", (email) => {
    connectedUsers[socket.id] = email;
    console.log(`✅ ${email} connecté`);
  });

  // Message
  socket.on("send_message", ({ to, message }) => {
    const recipientSocketId = Object.keys(connectedUsers).find(
      (id) => connectedUsers[id] === to
    );
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive_message", {
        from: connectedUsers[socket.id],
        message,
      });
    }
  });

  // Wizz
  socket.on("send_wizz", ({ to }) => {
    const recipientSocketId = Object.keys(connectedUsers).find(
      (id) => connectedUsers[id] === to
    );
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive_wizz", {
        from: connectedUsers[socket.id],
      });
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    const email = connectedUsers[socket.id];
    delete connectedUsers[socket.id];
    console.log(`❌ ${email} déconnecté`);
  });
});

// API REST
app.use("/users", userRoutes);

// Lancement serveur
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Backend prêt sur http://localhost:${PORT}`);
});
