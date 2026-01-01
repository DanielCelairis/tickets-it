require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Ticket = require("./models/Ticket");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARES
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies simples (sin librería)
app.use((req, res, next) => {
  const cookies = {};
  const raw = req.headers.cookie;
  if (raw) {
    raw.split(";").forEach(c => {
      const [k, v] = c.trim().split("=");
      cookies[k] = v;
    });
  }
  req.cookies = cookies;
  next();
});

// =====================
// CONEXIÓN MONGODB
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// =====================
// AUTH
// =====================
const users = JSON.parse(fs.readFileSync("./users.json"));

app.post("/login", (req, res) => {
  const { usuario, password } = req.body;

  const user = users.find(
    u => u.usuario === usuario && u.password === password
  );

  if (!user) {
    return res.json({ ok: false });
  }

  res.setHeader(
    "Set-Cookie",
    `rol=${user.rol}; HttpOnly; Path=/`
  );

  res.json({ ok: true, rol: user.rol });
});

app.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", "rol=; Max-Age=0; Path=/");
  res.json({ ok: true });
});

// =====================
// PROTECCIÓN
// =====================
function auth(req, res, next) {
  if (!req.cookies.rol) {
    return res.redirect("/login.html");
  }
  next();
}

function onlyIT(req, res, next) {
  if (req.cookies.rol !== "IT") {
    return res.status(403).json({ error: "No autorizado" });
  }
  next();
}

// =====================
// ARCHIVOS PÚBLICOS
// =====================
app.use(express.static(path.join(__dirname, "public")));

app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/dashboard.html", auth, (req, res) => {
  if (req.cookies.rol !== "IT") {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// =====================
// TICKETS
// =====================
app.get("/tickets", auth, async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.json(tickets);
});

app.post("/tickets", auth, async (req, res) => {
  await Ticket.create(req.body);
  res.json({ ok: true });
});

app.post("/estado", auth, onlyIT, async (req, res) => {
  await Ticket.findByIdAndUpdate(req.body.id, {
    estado: req.body.estado.trim()
  });
  res.json({ ok: true });
});

app.delete("/tickets/:id", auth, onlyIT, async (req, res) => {
  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// =====================
// REPORTE
// =====================
app.get("/reporte-cerrados", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const tickets = await Ticket.find({
    estado: "Cerrado",
    createdAt: { $gte: inicio, $lte: fin }
  });

  const resumen = {};
  tickets.forEach(t => {
    resumen[t.categoria] = (resumen[t.categoria] || 0) + 1;
  });

  res.json({
    totalCerrados: tickets.length,
    porCategoria: resumen
  });
});

app.get("/exportar-csv", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const tickets = await Ticket.find({
    estado: "Cerrado",
    createdAt: { $gte: inicio, $lte: fin }
  });

  let csv = "Tipo,Categoria,Descripcion,Estado,Fecha\n";

  tickets.forEach(t => {
    csv += `"${t.tipo}","${t.categoria}","${t.descripcion}","${t.estado}","${t.createdAt.toISOString()}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="tickets-cerrados-${mes}-${anio}.csv"`
  );

  res.send(csv);
});

app.delete("/eliminar-cerrados", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.body;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const result = await Ticket.deleteMany({
    estado: "Cerrado",
    createdAt: { $gte: inicio, $lte: fin }
  });

  res.json({
    ok: true,
    eliminados: result.deletedCount
  });
});

// =====================
app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
});