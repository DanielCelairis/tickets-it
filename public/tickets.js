const tabla = document.getElementById("tablaTickets");
const form = document.getElementById("formTicket");

let ticketActualId = null; // 🔖 guarda el ID del ticket abierto en el modal

// =====================
// CARGAR TICKETS (con filtros opcionales desde la URL)
// =====================
async function cargarTickets(estado = "", categoria = "", buscar = "") {
  let url = "/tickets?";
  if (estado) url += `estado=${estado}&`;
  if (categoria) url += `categoria=${encodeURIComponent(categoria)}&`;
  if (buscar) url += `buscar=${encodeURIComponent(buscar)}&`;

  const res = await fetch(url);
  const tickets = await res.json();

  tabla.innerHTML = "";

  if (tickets.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:30px;">No hay tickets que coincidan con los filtros.</td></tr>`;
    return;
  }

  tickets.forEach(t => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><span class="badge badge-${t.tipo.toLowerCase()}">${t.tipo}</span></td>
      <td>${t.categoria}</td>
      <td>${t.descripcion}</td>
      <td><span class="usuario-tag">👤 ${t.creadoPor || "—"}</span></td>
      <td>
        <select onchange="cambiarEstado('${t._id}', this.value)" class="select-estado ${t.estado === 'Cerrado' ? 'cerrado' : 'abierto'}">
          <option value="Abierto" ${t.estado === "Abierto" ? "selected" : ""}>Abierto</option>
          <option value="Cerrado" ${t.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
        </select>
      </td>
      <td class="acciones">
        <button class="btn-comentario" onclick="abrirModal('${t._id}', '${t.descripcion.replace(/'/g, "\\'")}')">💬</button>
        <button class="delete" onclick="eliminarTicket('${t._id}')">🗑️</button>
      </td>
    `;

    tabla.appendChild(tr);
  });
}

// =====================
// FILTRAR TICKETS
// =====================
let debounceTimer = null;

function filtrarTickets() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const estado = document.getElementById("filtroEstado").value;
    const categoria = document.getElementById("filtroCategoria").value;
    const buscar = document.getElementById("buscar").value.trim();
    cargarTickets(estado, categoria, buscar);
  }, 400); // espera 400ms después de dejar de escribir
}

function limpiarFiltros() {
  document.getElementById("filtroEstado").value = "";
  document.getElementById("filtroCategoria").value = "";
  document.getElementById("buscar").value = "";
  cargarTickets();
}

// =====================
// CAMBIAR ESTADO
// =====================
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

  cargarTickets(
    document.getElementById("filtroEstado").value,
    document.getElementById("filtroCategoria").value,
    document.getElementById("buscar").value.trim()
  );
}

// =====================
// ELIMINAR TICKET
// =====================
async function eliminarTicket(id) {
  if (!confirm("¿Eliminar este ticket?")) return;

  const res = await fetch(`/tickets/${id}`, { method: "DELETE" });

  if (!res.ok) {
    alert("❌ No autorizado");
    return;
  }

  cargarTickets(
    document.getElementById("filtroEstado").value,
    document.getElementById("filtroCategoria").value,
    document.getElementById("buscar").value.trim()
  );
}

// =====================
// CREAR TICKET
// =====================
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
  cargarTickets(
    document.getElementById("filtroEstado").value,
    document.getElementById("filtroCategoria").value,
    document.getElementById("buscar").value.trim()
  );
});

// =====================
// MODAL DE COMENTARIOS
// =====================
function abrirModal(id, descripcion) {
  ticketActualId = id;
  document.getElementById("modalDescripcion").innerText = `📌 ${descripcion}`;
  document.getElementById("modalComentarios").style.display = "flex";
  cargarComentarios(id);
}

function cerrarModal() {
  document.getElementById("modalComentarios").style.display = "none";
  ticketActualId = null;
}

// Cierra el modal si se hace clic fuera
document.getElementById("modalComentarios").addEventListener("click", function (e) {
  if (e.target === this) cerrarModal();
});

async function cargarComentarios(id) {
  // Obtenemos el ticket completo para leer sus comentarios
  const res = await fetch(`/tickets?`); // no hay endpoint individual, así que usamos la lista
  const tickets = await res.json();
  const ticket = tickets.find(t => t._id === id);

  const lista = document.getElementById("listadoComentarios");
  lista.innerHTML = "";

  if (!ticket || ticket.comentarios.length === 0) {
    lista.innerHTML = `<p style="color:#9ca3af;font-size:13px;text-align:center;">Aún no hay comentarios.</p>`;
    return;
  }

  ticket.comentarios.forEach(c => {
    const div = document.createElement("div");
    div.className = "comentario-item";
    div.innerHTML = `
      <div class="comentario-meta">
        <span class="comentario-autor">👤 ${c.autor}</span>
        <span class="comentario-fecha">${new Date(c.createdAt).toLocaleString()}</span>
      </div>
      <p class="comentario-texto">${c.texto}</p>
    `;
    lista.appendChild(div);
  });
}

async function agregarComentario() {
  const texto = document.getElementById("textoComentario").value.trim();
  if (!texto) return;

  const res = await fetch(`/tickets/${ticketActualId}/comentarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto })
  });

  if (!res.ok) {
    alert("❌ Error al agregar comentario");
    return;
  }

  document.getElementById("textoComentario").value = "";
  cargarComentarios(ticketActualId);
}

// =====================
// LOGOUT
// =====================
async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

// =====================
// INICIO
// =====================
cargarTickets();
