const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    tipo: String,
    categoria: String,
    descripcion: String,
    estado: {
      type: String,
      default: "Abierto"
    }
  },
  { timestamps: true } // 🔥 createdAt y updatedAt
);

module.exports = mongoose.model("Ticket", TicketSchema);