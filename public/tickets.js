const tabla = document.getElementById("tablaTickets");
const form = document.getElementById("formTicket");

async function cargarTickets() {
  const res = await fetch("/tickets");
  const tickets = await res.json();

  tabla.innerHTML = "";

  tickets.forEach(t => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${t.tipo}</td>
      <td>${t.categoria}</td>
      <td>${t.descripcion}</td>
      <td>
        <select onchange="cambiarEstado('${t._id}', this.value)">
          <option value="Abierto" ${t.estado === "Abierto" ? "selected" : ""}>Abierto</option>
          <option value="Cerrado" ${t.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
        </select>
      </td>
      <td>
        <button class="delete" onclick="eliminarTicket('${t._id}')">🗑️</button>
      </td>
    `;

    tabla.appendChild(tr);
  });
}

// 🔁 CAMBIAR ESTADO
async function cambiarEstado(id, estado) {
  const res = await fetch("/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado })
  });

  if (!res.ok) {
    alert("❌ No autorizado para cambiar estado");
    return;
  }

  cargarTickets();
}

// 🗑️ ELIMINAR TICKET
async function eliminarTicket(id) {
  if (!confirm("¿Eliminar este ticket?")) return;

  const res = await fetch(`/tickets/${id}`, { method: "DELETE" });

  if (!res.ok) {
    alert("❌ No autorizado");
    return;
  }

  cargarTickets();
}

// ➕ CREAR TICKET
form.addEventListener("submit", async e => {
  e.preventDefault();

  await fetch("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: tipo.value,
      categoria: categoria.value,
      descripcion: descripcion.value
    })
  });

  form.reset();
  cargarTickets();
});

// 🚪 LOGOUT
async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

cargarTickets();