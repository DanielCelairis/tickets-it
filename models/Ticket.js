const mongoose = require("mongoose");

const comentarioSchema = new mongoose.Schema(
  {
    autor: String,
    texto: String,
  },
  { timestamps: true }
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
    comentarios: [comentarioSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
