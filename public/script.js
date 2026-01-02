async function cargarTickets() {
  const res = await fetch("/tickets");
  const tickets = await res.json();

  const tbody = document.getElementById("tablaTickets");
  if (!tbody) return;

  tbody.innerHTML = "";

  tickets.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.tipo}</td>
      <td>${t.categoria}</td>
      <td>${t.descripcion}</td>
      <td>
        <select onchange="cambiarEstado('${t._id}', this.value)">
          <option ${t.estado === "Abierto" ? "selected" : ""}>Abierto</option>
          <option ${t.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
        </select>
      </td>
      <td>
        <button onclick="eliminarTicket('${t._id}')">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function cambiarEstado(id, estado) {
  await fetch("/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado })
  });
}

async function eliminarTicket(id) {
  if (!confirm("¿Eliminar ticket?")) return;
  await fetch(`/tickets/${id}`, { method: "DELETE" });
  cargarTickets();
}

document.getElementById("formTicket")?.addEventListener("submit", async e => {
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

  e.target.reset();
  cargarTickets();
});

async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

cargarTickets();