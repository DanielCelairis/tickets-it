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
    campo: String,
    valorAnterior: String,
    valorNuevo: String,
    hechoPor: String
  },
  { timestamps: true }
);

const TicketSchema = new mongoose.Schema(
  {
    tipo: String,
    categoria: String,
    subcategoria: String,  // 🆕 subcategoría dependiente de la categoría
    descripcion: String,
    estado: {
      type: String,
      enum: ["Abierto", "Cerrado", "Pendiente Usuario", "Pendiente Proveedor"],
      default: "Abierto"
    },
    prioridad: {
      type: String,
      enum: ["Alta", "Media", "Baja"],
      default: "Media"
    },
    tiempoGestion: {
      type: Number,
      default: null
    },
    creadoPor: String,
    comentarios: [comentarioSchema],
    historial: [historialSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
