require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const Ticket = require("./models/Ticket");

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => { console.error(err); process.exit(1); });

async function importarTickets() {
  // Leer el CSV
  const csv = fs.readFileSync("./tickets__3_.csv", "utf-8");
  const lineas = csv.split("\n").slice(1); // saltar header

  let insertados = 0;

  for (const linea of lineas) {
    if (!linea.trim()) continue; // saltar líneas vacías

    // Parsear cada línea (considerando que los campos están entre comillas)
    const match = linea.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
    if (!match) continue;

    const [, tipo, categoria, descripcion, estado, fechaOriginal] = match;

    // 🔧 Convertir fecha de febrero a enero
    const fechaFebrero = new Date(fechaOriginal);
    const fechaEnero = new Date(fechaFebrero);
    fechaEnero.setMonth(0); // mes 0 = enero
    // Mantiene el día, hora, minuto, segundo exactos

    // Crear el ticket en MongoDB con la fecha corregida
    const ticket = new Ticket({
      tipo,
      categoria,
      descripcion,
      estado,
      prioridad: "Media", // default porque el CSV no lo tiene
      creadoPor: "admin",  // asumimos que admin creó todos
      createdAt: fechaEnero,
      updatedAt: fechaEnero,
      historial: [
        {
          campo: "estado",
          valorAnterior: "—",
          valorNuevo: "Abierto",
          hechoPor: "admin",
          createdAt: fechaEnero
        }
      ]
    });

    // Si el ticket ya estaba cerrado, agregar una segunda entrada en el historial
    if (estado === "Cerrado") {
      // El cierre fue en el mismo momento (podemos ajustar +1 segundo si quieres)
      const fechaCierre = new Date(fechaEnero.getTime() + 1000);
      ticket.historial.push({
        campo: "estado",
        valorAnterior: "Abierto",
        valorNuevo: "Cerrado",
        hechoPor: "admin",
        createdAt: fechaCierre
      });
    }

    await ticket.save();
    insertados++;
  }

  console.log(`\n🎉 Tickets importados: ${insertados}`);
  console.log(`📅 Todos movidos de febrero a enero 2026`);
  
  mongoose.disconnect();
}

importarTickets();
