const express = require("express");
const fs = require("fs");
const path = require("path");
const USERS_FILE = path.join(__dirname, "users.json");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const FILE = path.join(__dirname, "tickets.json");

// Obtener todos los tickets
app.get("/tickets", (req, res) => {
  const data = fs.readFileSync(FILE, "utf8");
  res.json(JSON.parse(data));
});

// Crear un nuevo ticket
app.post("/tickets", (req, res) => {
  const tickets = JSON.parse(fs.readFileSync(FILE, "utf8"));

  const nuevoTicket = {
    id: Date.now(),
    tipo: req.body.tipo,
    categoria: req.body.categoria,
    descripcion: req.body.descripcion,
    estado: "Abierto",
    fecha: new Date().toLocaleString()
  };

  tickets.push(nuevoTicket);
  fs.writeFileSync(FILE, JSON.stringify(tickets, null, 2));

  res.json({ ok: true });
});

// Cambiar estado de ticket
app.post("/estado", (req, res) => {
  const tickets = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const ticket = tickets.find(t => t.id === req.body.id);

  if (ticket) {
    ticket.estado = req.body.estado;
    fs.writeFileSync(FILE, JSON.stringify(tickets, null, 2));
  }

  res.json({ ok: true });
});

// Descargar reporte en CSV
app.get("/reporte", (req, res) => {
  const tickets = JSON.parse(fs.readFileSync(FILE, "utf8"));

  let csv = "ID,Tipo,Categoria,Descripcion,Estado,Fecha\n";
  tickets.forEach(t => {
    csv += `${t.id},${t.tipo},${t.categoria},"${t.descripcion}",${t.estado},${t.fecha}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("reporte_tickets.csv");
  res.send(csv);
});

// Login
app.post("/login", (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  const user = users.find(
    u => u.usuario === req.body.usuario && u.password === req.body.password
  );

  if (user) {
    res.json({ ok: true, rol: user.rol });
  } else {
    res.json({ ok: false });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});