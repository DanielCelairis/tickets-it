require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => { console.error("❌ Error de conexión:", err.message); process.exit(1); });

const usuarios = [
  { usuario: "admin", password: "Cam01bio", rol: "IT" },
  { usuario: "user",  password: "user123",  rol: "USER" }
];

async function seed() {
  // Limpia usuarios previos
  const eliminados = await User.deleteMany({});
  console.log(`🗑️  Usuarios previos eliminados: ${eliminados.deletedCount}`);

  // Crea los usuarios
  for (const u of usuarios) {
    await User.create(u);
    console.log(`✅ Usuario creado: ${u.usuario} (rol: ${u.rol})`);
  }

  // 🔍 VERIFICACIÓN: lee de la base y muestra lo que está guardado
  console.log("\n--- VERIFICACIÓN ---");
  const guardados = await User.find({});
  console.log(`Total de usuarios en MongoDB: ${guardados.length}`);
  guardados.forEach(u => {
    console.log(`  → usuario: "${u.usuario}" | rol: "${u.rol}" | password hash: ${u.password.substring(0, 15)}...`);
  });

  if (guardados.length === 0) {
    console.log("❌ ERROR: No se grabaron usuarios. Revisa la conexión.");
  } else {
    console.log("\n🎉 Seed completado exitosamente.");
  }

  mongoose.disconnect();
}

seed();
