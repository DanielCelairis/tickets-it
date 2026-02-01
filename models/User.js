const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ["IT", "USER"], default: "USER" }
});

// 🔐 Antes de guardar, hashear la contraseña
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔍 Método para comparar contraseña
UserSchema.methods.compararPassword = async function (contraseña) {
  return await bcrypt.compare(contraseña, this.password);
};

module.exports = mongoose.model("User", UserSchema);
