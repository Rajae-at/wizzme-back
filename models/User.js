const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  pseudo: { type: String, required: true },
  salt: String,
  hash: String,
  token: String,
  friends: [String], // liste des emails d'amis
});

module.exports = mongoose.model("User", UserSchema);
