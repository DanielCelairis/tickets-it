require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

// 🗄️ Conecta a MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => { console.error(err); process.exit(1); });

const usuarios = [
  { usuario: "admin", password: "Cam01bio", rol: "IT" },
  { usuario: "user",  password: "user123",  rol: "USER" }
];

async function seed() {
  // Limpia usuarios previos
  await User.deleteMany({});
  console.log("🗑️  Usuarios previos eliminados");

  // Crea los usuarios (el pre-save hook hace el hash automáticamente)
  for (const u of usuarios) {
    await User.create(u);
    console.log(`✅ Usuario creado: ${u.usuario} (rol: ${u.rol})`);
  }

  console.log("\n🎉 Seed completado. Ya puedes usar el sistema.");
  mongoose.disconnect();
}

seed();
