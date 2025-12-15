const form = document.getElementById("formTicket");
const rol = localStorage.getItem("rol");

if (!rol) {
  location.href = "/login.html";
}

const tipoInput = document.getElementById("tipo");
const categoriaInput = document.getElementById("categoria");
const descripcionInput = document.getElementById("descripcion");
const tabla = document.getElementById("tablaTickets");

// Crear ticket
form.addEventListener("submit", e => {
  e.preventDefault();

  const tipo = tipoInput.value;
  const categoria = categoriaInput.value;
  const descripcion = descripcionInput.value.trim();

  if (!descripcion) {
    alert("Escribe una descripción");
    return;
  }

  fetch("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, categoria, descripcion })
  }).then(() => {
    form.reset();
    cargarTickets();
  });
});

// Cargar tickets
function cargarTickets() {
  fetch("/tickets")
    .then(res => res.json())
    .then(tickets => {
      tabla.innerHTML = "";

      tickets.forEach(t => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${t.tipo}</td>
          <td>${t.categoria}</td>
          <td>${t.descripcion}</td>
          <td>
            <select onchange="cambiarEstado('${t._id}', this.value)" ${rol !== "IT" ? "disabled" : ""}>
              <option ${t.estado === "Abierto" ? "selected" : ""}>Abierto</option>
              <option ${t.estado === "En Proceso" ? "selected" : ""}>En Proceso</option>
              <option ${t.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
            </select>
          </td>
          <td>
            ${rol === "IT" ? `<button onclick="eliminarTicket('${t._id}')">🗑</button>` : ""}
          </td>
        `;

        tabla.appendChild(tr);
      });
    });
}

function cambiarEstado(id, estado) {
  fetch("/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado })
  }).then(cargarTickets);
}

function eliminarTicket(id) {
  if (!confirm("¿Eliminar ticket?")) return;

  fetch(`/tickets/${id}`, {
    method: "DELETE"
  }).then(cargarTickets);
}

function logout() {
  localStorage.clear();
  location.href = "/login.html";
}

window.onload = cargarTickets;