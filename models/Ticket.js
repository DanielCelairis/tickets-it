const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  tipo: String,
  categoria: String,
  descripcion: String,
  estado: {
    type: String,
    default: "Abierto"
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Ticket", TicketSchema);