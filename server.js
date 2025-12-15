require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Ticket = require("./models/Ticket");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔌 Conexión Mongo
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Mongo error:", err));

// Obtener tickets
app.get("/tickets", async (req, res) => {
  const tickets = await Ticket.find().sort({ fecha: -1 });
  res.json(tickets);
});

// Crear ticket
app.post("/tickets", async (req, res) => {
  await Ticket.create(req.body);
  res.json({ ok: true });
});

// Cambiar estado
app.post("/estado", async (req, res) => {
  await Ticket.findByIdAndUpdate(req.body.id, {
    estado: req.body.estado
  });
  res.json({ ok: true });
});

// Eliminar ticket
app.delete("/tickets/:id", async (req, res) => {
  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Login (sigue con JSON)
app.post("/login", (req, res) => {
  const users = JSON.parse(fs.readFileSync("users.json"));
  const user = users.find(
    u => u.usuario === req.body.usuario && u.password === req.body.password
  );

  if (user) res.json({ ok: true, rol: user.rol });
  else res.json({ ok: false });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});