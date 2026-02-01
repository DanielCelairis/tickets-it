const mongoose = require("mongoose");

const comentarioSchema = new mongoose.Schema(
  {
    autor: String,
    texto: String,
  },
  { timestamps: true } // createdAt automático en cada comentario
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
    creadoPor: String, // 👤 usuario que creó el ticket
    comentarios: [comentarioSchema] // 💬 array de comentarios
  },
  { timestamps: true } // createdAt y updatedAt del ticket
);

module.exports = mongoose.model("Ticket", TicketSchema);
