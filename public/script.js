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
            <select onchange="cambiarEstado(${t.id}, this.value)">
              <option ${t.estado=="Abierto"?"selected":""}>Abierto</option>
              <option ${t.estado=="En Proceso"?"selected":""}>En Proceso</option>
              <option ${t.estado=="Cerrado"?"selected":""}>Cerrado</option>
            </select>
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

if (rol !== "IT") {
  document.querySelectorAll("select").forEach(s => {
    if (s.onchange) s.disabled = true;
  });
}