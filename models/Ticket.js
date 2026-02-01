const mongoose = require("mongoose");

const comentarioSchema = new mongoose.Schema(
  {
    autor: String,
    texto: String,
  },
  { timestamps: true }
);

const historialSchema = new mongoose.Schema(
  {
    campo: String,          // ej: "estado", "prioridad"
    valorAnterior: String,  // ej: "Abierto"
    valorNuevo: String,     // ej: "Cerrado"
    hechoPor: String        // usuario que hizo el cambio
  },
  { timestamps: true }      // createdAt automático en cada entrada
);

const TicketSchema = new mongoose.Schema(
  {
    tipo: String,
    categoria: String,
    descripcion: String,
    estado: {
      type: String,
      default: "Abierto"
    },
    prioridad: {
      type: String,
      enum: ["Alta", "Media", "Baja"],
      default: "Media"
    },
    creadoPor: String,
    comentarios: [comentarioSchema],
    historial: [historialSchema]   // 📜 línea de tiempo del ticket
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
