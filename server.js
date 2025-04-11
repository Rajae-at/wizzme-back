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

  // Envoyer la liste initiale des utilisateurs en ligne à ce nouveau socket
  const onlineEmails = Object.values(connectedUsers);
  socket.emit("initial_online_users", onlineEmails);
  console.log(`✉️ Liste initiale envoyée à ${socket.id}:`, onlineEmails);

  // Identification
  socket.on("set_identity", ({ email }) => {
    if (email) {
      const previousEmail = connectedUsers[socket.id];
      // Si l'utilisateur change d'identité (peu probable mais géré)
      if (previousEmail && previousEmail !== email) {
        socket.broadcast.emit("user_status_change", {
          email: previousEmail,
          status: "offline",
        });
        console.log(
          `🔄 ${previousEmail} remplacé par ${email} pour ${socket.id}`
        );
      }

      // Si l'utilisateur n'était pas déjà enregistré avec cet email
      if (!Object.values(connectedUsers).includes(email)) {
        socket.broadcast.emit("user_status_change", {
          email,
          status: "online",
        });
        console.log(`📢 ${email} est maintenant en ligne (annoncé aux autres)`);
      }

      connectedUsers[socket.id] = email;
      console.log(`✅ ${email} (Socket ID: ${socket.id}) identifié`);
    } else {
      console.error(
        "Tentative d'identification échouée: Email manquant pour socket",
        socket.id
      );
    }
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
    if (email) {
      delete connectedUsers[socket.id];
      console.log(`❌ ${email} (Socket ID: ${socket.id}) déconnecté`);

      // Vérifier si cet utilisateur a d'autres connexions actives
      const isStillConnected = Object.values(connectedUsers).includes(email);

      if (!isStillConnected) {
        // Informer les autres utilisateurs
        io.emit("user_status_change", { email, status: "offline" });
        console.log(`📢 ${email} est maintenant hors ligne (annoncé à tous)`);
      }
    } else {
      console.log(
        `❓ Socket ID ${socket.id} déconnecté (sans email associé trouvé).`
      );
    }
  });
});

// API REST
app.use("/users", userRoutes);

// Lancement serveur
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Backend prêt sur http://localhost:${PORT}`);
});
