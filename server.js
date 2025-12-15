require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const Ticket = require("./models/Ticket");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================
// CONEXIÓN MONGODB
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// =====================
// RUTAS TICKETS
// =====================

// Obtener todos los tickets
app.get("/tickets", async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.json(tickets);
});

// Crear ticket
app.post("/tickets", async (req, res) => {
  const ticket = new Ticket({
    tipo: req.body.tipo,
    categoria: req.body.categoria,
    descripcion: req.body.descripcion
  });

  await ticket.save();
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

// =====================
// REPORTE SOLO CERRADOS
// =====================
app.get("/reporte-cerrados", async (req, res) => {
  const tickets = await Ticket.find({ estado: "Cerrado" });

  const resumen = {};
  tickets.forEach(t => {
    resumen[t.categoria] = (resumen[t.categoria] || 0) + 1;
  });

  res.json({
    totalCerrados: tickets.length,
    porCategoria: resumen
  });
});

// =====================
// SERVIDOR
// =====================
app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});