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
// AUTH
// =====================
app.post("/login", async (req, res) => {
  try {
    const { usuario, password } = req.body;

    console.log("LOGIN INTENTO - usuario recibido:", usuario);
    console.log("LOGIN INTENTO - password recibido:", password ? "sí tiene valor" : "está vacío");

    if (!usuario || !password) {
      console.log("LOGIN FALLO - campos vacíos");
      return res.json({ ok: false });
    }

    const user = await User.findOne({ usuario });

    console.log("LOGIN - usuario encontrado en DB:", user ? "SÍ" : "NO");

    if (!user) return res.json({ ok: false });

    const match = await bcrypt.compare(password, user.password);

    console.log("LOGIN - contraseña coincide:", match);

    if (!match) return res.json({ ok: false });

    res.setHeader("Set-Cookie", [
      `rol=${user.rol}; HttpOnly; Path=/`,
      `usuario=${user.usuario}; HttpOnly; Path=/`
    ]);

    console.log("LOGIN EXITOSO - usuario:", user.usuario, "rol:", user.rol);
    res.json({ ok: true, rol: user.rol });

  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", [
    "rol=; Max-Age=0; Path=/",
    "usuario=; Max-Age=0; Path=/"
  ]);
  res.json({ ok: true });
});

function auth(req, res, next) {
  if (!req.cookies.rol) return res.redirect("/login.html");
  next();
}

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

// GET /tickets — con filtros opcionales (estado, categoria, prioridad, buscar)
app.get("/tickets", auth, async (req, res) => {
  const filtro = {};

  if (req.query.estado) filtro.estado = req.query.estado;
  if (req.query.categoria) filtro.categoria = req.query.categoria;
  if (req.query.prioridad) filtro.prioridad = req.query.prioridad;
  if (req.query.buscar) {
    const regex = new RegExp(req.query.buscar, "i");
    filtro.$or = [
      { descripcion: regex },
      { categoria: regex },
      { creadoPor: regex }
    ];
  }

  // Ordenamiento: primero por prioridad (Alta → Media → Baja), luego por fecha
  const tickets = await Ticket.find(filtro).sort({
    "prioridad": 1, // se ordena alfabéticamente, así que usamos el campo calculado abajo
    createdAt: -1
  });

  // Ordenar manualmente por prioridad: Alta primero, luego Media, luego Baja
  const orden = { "Alta": 0, "Media": 1, "Baja": 2 };
  tickets.sort((a, b) => {
    if (orden[a.prioridad] !== orden[b.prioridad]) return orden[a.prioridad] - orden[b.prioridad];
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(tickets);
});

// POST /tickets — incluye prioridad
app.post("/tickets", auth, async (req, res) => {
  await Ticket.create({
    tipo: req.body.tipo,
    categoria: req.body.categoria,
    descripcion: req.body.descripcion,
    prioridad: req.body.prioridad || "Media",
    creadoPor: req.cookies.usuario
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

// GET /reporte-cerrados — resumen mensual de cerrados por categoría
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

// GET /reporte-abiertos — cantidad de tickets abiertos del mes
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

// GET /reporte-prioridades — tickets abiertos agrupados por prioridad
app.get("/reporte-prioridades", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const tickets = await Ticket.find({
    estado: "Abierto",
    createdAt: { $gte: inicio, $lte: fin }
  });

  const resultado = { Alta: 0, Media: 0, Baja: 0 };
  tickets.forEach(t => {
    if (resultado[t.prioridad] !== undefined) {
      resultado[t.prioridad]++;
    }
  });

  res.json(resultado);
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

  let csv = "Tipo,Categoria,Descripcion,Prioridad,Estado,Creado Por,Fecha\n";
  tickets.forEach(t => {
    csv += `"${t.tipo}","${t.categoria}","${t.descripcion}","${t.prioridad || "Media"}","${t.estado}","${t.creadoPor || "—"}","${t.createdAt.toISOString()}"\n`;
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
