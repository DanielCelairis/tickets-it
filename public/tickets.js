const tabla = document.getElementById("tablaTickets");
const form = document.getElementById("formTicket");

let ticketActualId = null;

// =====================
// CARGAR TICKETS (con filtros opcionales)
// =====================
async function cargarTickets(estado = "", categoria = "", buscar = "", prioridad = "") {
  let url = "/tickets?";
  if (estado) url += `estado=${estado}&`;
  if (categoria) url += `categoria=${encodeURIComponent(categoria)}&`;
  if (buscar) url += `buscar=${encodeURIComponent(buscar)}&`;
  if (prioridad) url += `prioridad=${prioridad}&`;

  const res = await fetch(url);
  const tickets = await res.json();

  tabla.innerHTML = "";

  if (tickets.length === 0) {
    tabla.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:30px;">No hay tickets que coincidan con los filtros.</td></tr>`;
    return;
  }

  tickets.forEach(t => {
    const tr = document.createElement("tr");

    // Si es Alta prioridad y está abierto, la fila se destaca
    if (t.prioridad === "Alta" && t.estado === "Abierto") {
      tr.className = "fila-alta-prioridad";
    }

    tr.innerHTML = `
      <td><span class="badge badge-${t.tipo.toLowerCase()}">${t.tipo}</span></td>
      <td>${t.categoria}</td>
      <td>${t.descripcion}</td>
      <td><span class="badge-prioridad prioridad-${t.prioridad.toLowerCase()}">${t.prioridad === "Alta" ? "🔴" : t.prioridad === "Media" ? "🟡" : "🟢"} ${t.prioridad}</span></td>
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
// OBTENER FILTROS ACTUALES
// =====================
function getFiltros() {
  return {
    estado: document.getElementById("filtroEstado").value,
    categoria: document.getElementById("filtroCategoria").value,
    buscar: document.getElementById("buscar").value.trim(),
    prioridad: document.getElementById("filtroPrioridad").value
  };
}

// =====================
// FILTRAR TICKETS
// =====================
let debounceTimer = null;

function filtrarTickets() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const f = getFiltros();
    cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
  }, 400);
}

function limpiarFiltros() {
  document.getElementById("filtroEstado").value = "";
  document.getElementById("filtroCategoria").value = "";
  document.getElementById("buscar").value = "";
  document.getElementById("filtroPrioridad").value = "";
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

  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
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

  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
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
      tipo: document.getElementById("tipo").value,
      categoria: document.getElementById("categoria").value,
      descripcion: document.getElementById("descripcion").value,
      prioridad: document.getElementById("prioridad").value
    })
  });

  form.reset();
  // Resetear prioridad a Media después de crear
  document.getElementById("prioridad").value = "Media";

  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
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

document.getElementById("modalComentarios").addEventListener("click", function (e) {
  if (e.target === this) cerrarModal();
});

async function cargarComentarios(id) {
  const res = await fetch(`/tickets?`);
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
