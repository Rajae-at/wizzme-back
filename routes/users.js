const express = require("express");
const router = express.Router();
const User = require("../models/User");

const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// 🔐 Register
router.post("/register", async (req, res) => {
  const { email, pseudo, password } = req.body;
  console.log("📥 Requête REGISTER", req.body);

  if (!email || !pseudo || !password) {
    console.log("❌ Champs manquants.");
    return res.status(400).json({ error: "Champs manquants." });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("⚠️ Utilisateur déjà existant :", email);
    return res.status(409).json({ error: "Utilisateur déjà existant." });
  }

  const salt = uid2(16);
  const hash = SHA256(password + salt).toString(encBase64);
  const token = uid2(32);

  const newUser = new User({ email, pseudo, salt, hash, token, friends: [] });
  await newUser.save();

  console.log("✅ Utilisateur créé :", { email, pseudo, token });

  res.status(201).json({ email, pseudo, token });
});

// 🔓 Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("📥 Requête LOGIN", email);

  const user = await User.findOne({ email });
  if (!user) {
    console.log("❌ Email non trouvé :", email);
    return res.status(401).json({ error: "Utilisateur non trouvé." });
  }

  const hash = SHA256(password + user.salt).toString(encBase64);
  if (hash !== user.hash) {
    console.log("❌ Mauvais mot de passe pour :", email);
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  console.log("✅ Connexion réussie :", email);
  res.json({ email, pseudo: user.pseudo, token: user.token });
});

// 📃 LISTER LES UTILISATEURS
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "email pseudo"); // Récupère tous les utilisateurs (seulement email et pseudo)
    console.log(`📃 ${users.length} utilisateurs trouvés`); // Affiche combien d'utilisateurs ont été récupérés

    if (users.length === 0) {
      console.log("❌ Aucun utilisateur trouvé dans la base.");
      return res.status(404).json({ message: "Aucun utilisateur trouvé." });
    }

    console.log("📤 Réponse envoyée :", users); // Ajouté ici
    res.json(users); // Renvoie les utilisateurs au format JSON
  } catch (error) {
    console.error("❌ Erreur GET /users :", error); // Si une erreur survient dans la requête
    res.status(500).json({ error: "Erreur serveur" }); // En cas de problème, on renvoie un message d'erreur serveur
  }
});

// ➤ AJOUTER UN AMI
router.post("/:id/friends", async (req, res) => {
  const { friendEmail } = req.body; // Email de l'ami à ajouter
  console.log("➕ Ajout d'ami :", friendEmail);

  // Trouver l'utilisateur par son ID (paramètre :id)
  const user = await User.findById(req.params.id);
  if (!user) {
    console.log("❌ Utilisateur non trouvé pour ID :", req.params.id);
    return res.status(404).json({ error: "Utilisateur non trouvé." });
  }

  // Si l'ami n'est pas déjà dans la liste
  if (!user.friends.includes(friendEmail)) {
    user.friends.push(friendEmail);
    await user.save(); // Sauvegarde les modifications
    console.log(`👯 Ami ajouté à ${user.email} : ${friendEmail}`);
  } else {
    console.log("⚠️ Ami déjà dans la liste");
  }

  res.json({ message: "Ami ajouté.", friends: user.friends });
});

module.exports = router;
