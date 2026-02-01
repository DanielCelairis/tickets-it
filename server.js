require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const Ticket = require("./models/Ticket");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARES
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies simples
app.use((req, res, next) => {
  const cookies = {};
  const raw = req.headers.cookie;
  if (raw) {
    raw.split(";").forEach(c => {
      const [k, ...v] = c.trim().split("=");
      cookies[k] = v.join("=");
    });
  }
  req.cookies = cookies;
  next();
});

// =====================
// MONGODB
// =====================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error(err));

// =====================
// AUTH (ahora con MongoDB + bcrypt)
// =====================
app.post("/login", async (req, res) => {
  const { usuario, password } = req.body;

  const user = await User.findOne({ usuario });
  if (!user) return res.json({ ok: false });

  const match = await user.compararPassword(password);
  if (!match) return res.json({ ok: false });

  // Cookie con rol y usuario
  res.setHeader("Set-Cookie", [
    `rol=${user.rol}; HttpOnly; Path=/`,
    `usuario=${user.usuario}; HttpOnly; Path=/`
  ]);

  res.json({ ok: true, rol: user.rol });
});

app.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", [
    "rol=; Max-Age=0; Path=/",
    "usuario=; Max-Age=0; Path=/"
  ]);
  res.json({ ok: true });
});

// Middleware: requiere estar logueado
function auth(req, res, next) {
  if (!req.cookies.rol) return res.redirect("/login.html");
  next();
}

// Middleware: solo rol IT
function onlyIT(req, res, next) {
  if (req.cookies.rol !== "IT") {
    return res.status(403).json({ error: "No autorizado" });
  }
  next();
}

// =====================
// PUBLIC (estático)
// =====================
app.use("/login.html", express.static(path.join(__dirname, "public/login.html")));
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/styles", express.static(path.join(__dirname, "public/styles")));
app.use("/img", express.static(path.join(__dirname, "public/img")));
app.use("/tickets.js", express.static(path.join(__dirname, "public/tickets.js")));
app.use("/dashboard.js", express.static(path.join(__dirname, "public/dashboard.js")));

app.get("/", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/dashboard.html", auth, onlyIT, (req, res) =>
  res.sendFile(path.join(__dirname, "public/dashboard.html"))
);

// =====================
// TICKETS
// =====================

// GET /tickets — con filtros opcionales (estado, categoria, buscar)
app.get("/tickets", auth, async (req, res) => {
  const filtro = {};

  if (req.query.estado) filtro.estado = req.query.estado;
  if (req.query.categoria) filtro.categoria = req.query.categoria;
  if (req.query.buscar) {
    const regex = new RegExp(req.query.buscar, "i");
    filtro.$or = [
      { descripcion: regex },
      { categoria: regex },
      { creadoPor: regex }
    ];
  }

  const tickets = await Ticket.find(filtro).sort({ createdAt: -1 });
  res.json(tickets);
});

// POST /tickets — guarda quién lo creó
app.post("/tickets", auth, async (req, res) => {
  await Ticket.create({
    tipo: req.body.tipo,
    categoria: req.body.categoria,
    descripcion: req.body.descripcion,
    creadoPor: req.cookies.usuario // 👤 se toma del cookie
  });
  res.json({ ok: true });
});

// 🔐 SOLO IT PUEDE CAMBIAR ESTADO
app.post("/estado", auth, onlyIT, async (req, res) => {
  await Ticket.findByIdAndUpdate(req.body.id, {
    estado: req.body.estado
  });
  res.json({ ok: true });
});

// 🗑️ SOLO IT PUEDE ELIMINAR
app.delete("/tickets/:id", auth, onlyIT, async (req, res) => {
  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// =====================
// COMENTARIOS
// =====================

// POST /tickets/:id/comentarios — agregar comentario
app.post("/tickets/:id/comentarios", auth, async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

  ticket.comentarios.push({
    autor: req.cookies.usuario,
    texto: req.body.texto
  });

  await ticket.save();
  res.json({ ok: true, comentarios: ticket.comentarios });
});

// =====================
// REPORTES / DASHBOARD
// =====================

// GET /reporte-cerrados — resumen mensual de cerrados
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

// GET /reporte-abiertos — cantidad de tickets abiertos del mes actual
app.get("/reporte-abiertos", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const total = await Ticket.countDocuments({
    estado: "Abierto",
    createdAt: { $gte: inicio, $lte: fin }
  });

  res.json({ totalAbiertos: total });
});

// GET /exportar-csv
app.get("/exportar-csv", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const tickets = await Ticket.find({
    estado: "Cerrado",
    createdAt: { $gte: inicio, $lte: fin }
  });

  let csv = "Tipo,Categoria,Descripcion,Estado,Creado Por,Fecha\n";
  tickets.forEach(t => {
    csv += `"${t.tipo}","${t.categoria}","${t.descripcion}","${t.estado}","${t.creadoPor || "—"}","${t.createdAt.toISOString()}"\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=tickets.csv");
  res.send(csv);
});

// =====================
// ELIMINACIÓN MASIVA (SOLO IT)
// =====================
app.delete("/tickets-masivo", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  if (!mes || !anio) {
    return res.status(400).json({ error: "Mes y año requeridos" });
  }

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const resultado = await Ticket.deleteMany({
    createdAt: { $gte: inicio, $lte: fin }
  });

  res.json({
    ok: true,
    eliminados: resultado.deletedCount
  });
});

// =====================
// INICIO DEL SERVIDOR
// =====================
app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
