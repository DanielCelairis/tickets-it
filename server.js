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

app.get("/me", (req, res) => {
  if (!req.cookies.rol) return res.json({ logueado: false });
  res.json({ logueado: true, usuario: req.cookies.usuario, rol: req.cookies.rol });
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

function formatearTiempo(minutos) {
  if (!minutos || minutos === 0) return "0m";
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}m`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}m`;
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
app.use("/usuarios.js", express.static(path.join(__dirname, "public/usuarios.js")));
app.use("/styles/usuarios.css", express.static(path.join(__dirname, "public/styles/usuarios.css")));

app.get("/", auth, (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/dashboard.html", auth, onlyIT, (req, res) =>
  res.sendFile(path.join(__dirname, "public/dashboard.html"))
);

app.get("/usuarios.html", auth, onlyIT, (req, res) =>
  res.sendFile(path.join(__dirname, "public/usuarios.html"))
);

// =====================
// TICKETS
// =====================
app.get("/tickets", auth, async (req, res) => {
  const filtro = {};

  if (req.query.estado) filtro.estado = req.query.estado;
  if (req.query.categoria) filtro.categoria = req.query.categoria;
  if (req.query.subcategoria) filtro.subcategoria = req.query.subcategoria;
  if (req.query.prioridad) filtro.prioridad = req.query.prioridad;
  if (req.query.buscar) {
    const regex = new RegExp(req.query.buscar, "i");
    filtro.$or = [
      { descripcion: regex },
      { categoria: regex },
      { subcategoria: regex },
      { creadoPor: regex }
    ];
  }

  const tickets = await Ticket.find(filtro).sort({ createdAt: -1 });

  const orden = { "Alta": 0, "Media": 1, "Baja": 2 };
  tickets.sort((a, b) => {
    if (orden[a.prioridad] !== orden[b.prioridad]) return orden[a.prioridad] - orden[b.prioridad];
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(tickets);
});

app.post("/tickets", auth, async (req, res) => {
  const ticket = await Ticket.create({
    tipo: req.body.tipo,
    categoria: req.body.categoria,
    subcategoria: req.body.subcategoria,
    descripcion: req.body.descripcion,
    prioridad: req.body.prioridad || "Media",
    creadoPor: req.cookies.usuario,
    historial: [
      {
        campo: "estado",
        valorAnterior: "—",
        valorNuevo: "Abierto",
        hechoPor: req.cookies.usuario
      }
    ]
  });
  res.json({ ok: true });
});

app.post("/estado", auth, onlyIT, async (req, res) => {
  const ticket = await Ticket.findById(req.body.id);
  if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

  if (ticket.estado !== req.body.estado) {
    ticket.historial.push({
      campo: "estado",
      valorAnterior: ticket.estado,
      valorNuevo: req.body.estado,
      hechoPor: req.cookies.usuario
    });

    ticket.estado = req.body.estado;

    if (req.body.estado === "Cerrado" && req.body.tiempoGestion) {
      ticket.tiempoGestion = parseInt(req.body.tiempoGestion);
    }

    await ticket.save();
  }

  res.json({ ok: true });
});

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
// USUARIOS (solo IT)
// =====================
app.get("/usuarios", auth, onlyIT, async (req, res) => {
  const usuarios = await User.find({}, { password: 0 });
  res.json(usuarios);
});

app.post("/usuarios", auth, onlyIT, async (req, res) => {
  const { usuario, password, rol } = req.body;

  if (!usuario || !password || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  if (!["IT", "USER"].includes(rol)) {
    return res.status(400).json({ error: "Rol inválido" });
  }

  const existe = await User.findOne({ usuario });
  if (existe) {
    return res.status(400).json({ error: "ese nombre de usuario ya existe" });
  }

  await User.create({ usuario, password, rol });
  res.json({ ok: true });
});

app.delete("/usuarios/:id", auth, onlyIT, async (req, res) => {
  const usuario = await User.findById(req.params.id);
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

  if (usuario.usuario === req.cookies.usuario) {
    return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });
  }

  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// =====================
// REPORTES / DASHBOARD
// =====================

// GET /reporte-cerrados — ahora agrupa por categoria Y subcategoria
app.get("/reporte-cerrados", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const tickets = await Ticket.find({
    estado: "Cerrado",
    createdAt: { $gte: inicio, $lte: fin }
  });

  // Agrupar por categoría (para el pie chart)
  const porCategoria = {};
  tickets.forEach(t => {
    porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + 1;
  });

  // Agrupar por categoría + subcategoría (para la tabla de detalles)
  const detallado = [];
  tickets.forEach(t => {
    const key = `${t.categoria} > ${t.subcategoria}`;
    const existente = detallado.find(d => d.key === key);
    if (existente) {
      existente.total++;
    } else {
      detallado.push({
        key,
        categoria: t.categoria,
        subcategoria: t.subcategoria,
        total: 1
      });
    }
  });

  res.json({
    totalCerrados: tickets.length,
    porCategoria,
    detallado: detallado.sort((a, b) => b.total - a.total)
  });
});

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

app.get("/estadisticas-tiempo", auth, onlyIT, async (req, res) => {
  const { mes, anio } = req.query;

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 0, 23, 59, 59);

  const tickets = await Ticket.find({
    estado: "Cerrado",
    createdAt: { $gte: inicio, $lte: fin },
    tiempoGestion: { $ne: null }
  });

  // Por categoría
  const porCategoria = {};
  tickets.forEach(t => {
    if (!porCategoria[t.categoria]) {
      porCategoria[t.categoria] = { suma: 0, cantidad: 0 };
    }
    porCategoria[t.categoria].suma += t.tiempoGestion;
    porCategoria[t.categoria].cantidad++;
  });

  const promedioCategoria = {};
  Object.keys(porCategoria).forEach(cat => {
    const promMinutos = Math.round(porCategoria[cat].suma / porCategoria[cat].cantidad);
    promedioCategoria[cat] = formatearTiempo(promMinutos);
  });

  // Por prioridad
  const porPrioridad = {};
  tickets.forEach(t => {
    if (!porPrioridad[t.prioridad]) {
      porPrioridad[t.prioridad] = { suma: 0, cantidad: 0 };
    }
    porPrioridad[t.prioridad].suma += t.tiempoGestion;
    porPrioridad[t.prioridad].cantidad++;
  });

  const promedioPrioridad = {};
  Object.keys(porPrioridad).forEach(pri => {
    const promMinutos = Math.round(porPrioridad[pri].suma / porPrioridad[pri].cantidad);
    promedioPrioridad[pri] = formatearTiempo(promMinutos);
  });

  res.json({
    porCategoria: promedioCategoria,
    porPrioridad: promedioPrioridad
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

  let csv = "Tipo,Categoria,Subcategoria,Descripcion,Prioridad,Estado,Creado Por,Tiempo Gestion,Fecha\n";
  tickets.forEach(t => {
    const tiempo = t.tiempoGestion ? formatearTiempo(t.tiempoGestion) : "—";
    csv += `"${t.tipo}","${t.categoria}","${t.subcategoria || "—"}","${t.descripcion}","${t.prioridad || "Media"}","${t.estado}","${t.creadoPor || "—"}","${tiempo}","${t.createdAt.toISOString()}"\n`;
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
