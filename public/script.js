function crearTicket() {
  const tipo = tipoSelect().value;
  const categoria = categoriaSelect().value;
  const descripcion = document.getElementById("descripcion").value;

  if (!descripcion) {
    alert("Escribe una descripción");
    return;
  }

  fetch("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, categoria, descripcion })
  })
  .then(() => {
    document.getElementById("descripcion").value = "";
    cargarTickets();
  });
}
<select class="estado" onchange="cambiarEstado(...)"></select>
function cargarTickets() {
  fetch("/tickets")
    .then(res => res.json())
    .then(tickets => {
      const tbody = document.querySelector("#tablaTickets tbody");
      tbody.innerHTML = "";

      tickets.forEach(t => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
  <td>${t.tipo}</td>
  <td>${t.categoria}</td>
  <td>${t.descripcion}</td>
  <td>
    <select class="estado" onchange="cambiarEstado('${t._id}', this.value)">
      <option ${t.estado === "Abierto" ? "selected" : ""}>Abierto</option>
      <option ${t.estado === "En Proceso" ? "selected" : ""}>En Proceso</option>
      <option ${t.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
    </select>
  </td>
  <td>
    ${localStorage.getItem("rol") === "IT"
      ? `<button onclick="eliminarTicket('${t._id}')">🗑 Eliminar</button>`
      : ""}
  </td>
`;
        tbody.appendChild(fila);
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

function tipoSelect() {
  return document.getElementById("tipo");
}

function categoriaSelect() {
  return document.getElementById("categoria");
}

window.onload = cargarTickets;

const rol = localStorage.getItem("rol");

// Ambos pueden crear tickets
document.getElementById("formTicket").style.display = "block";

// Solo IT puede cambiar estados
if (rol !== "IT") {
  document.querySelectorAll(".estado").forEach(e => {
    e.disabled = true;
  });
  }

 function logout() {
  localStorage.clear();
  location.replace("/login.html");
}

function eliminarTicket(id) {
  if (!confirm("¿Eliminar este ticket?")) return;

  fetch(`/tickets/${id}`, {
    method: "DELETE"
  })
  .then(() => cargarTickets());
}