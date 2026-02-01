const tabla = document.getElementById("tablaTickets");
const form = document.getElementById("formTicket");

let ticketActualId = null;

// =====================
// CARGAR TICKETS
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
  document.getElementById("prioridad").value = "Media";

  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
});

// =====================
// MODAL — ABRIR / CERRAR
// =====================
function abrirModal(id, descripcion) {
  ticketActualId = id;
  document.getElementById("modalDescripcion").innerText = `📌 ${descripcion}`;
  document.getElementById("modalComentarios").style.display = "flex";

  // Siempre abre en la pestaña de comentarios
  cambiarTab("comentarios");

  // Cargar ambos datos
  cargarComentarios(id);
  cargarHistorial(id);
}

function cerrarModal() {
  document.getElementById("modalComentarios").style.display = "none";
  ticketActualId = null;
}

document.getElementById("modalComentarios").addEventListener("click", function (e) {
  if (e.target === this) cerrarModal();
});

// =====================
// MODAL — PESTAÑAS
// =====================
function cambiarTab(pestaña) {
  // Botones de tab
  document.getElementById("tabComentarios").className = "tab-btn" + (pestaña === "comentarios" ? " tab-activo" : "");
  document.getElementById("tabHistorial").className   = "tab-btn" + (pestaña === "historial"   ? " tab-activo" : "");

  // Contenido
  document.getElementById("contenidoComentarios").style.display = pestaña === "comentarios" ? "flex" : "none";
  document.getElementById("contenidoHistorial").style.display   = pestaña === "historial"   ? "block" : "none";
}

// =====================
// COMENTARIOS
// =====================
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
// HISTORIAL
// =====================
async function cargarHistorial(id) {
  const res = await fetch(`/tickets?`);
  const tickets = await res.json();
  const ticket = tickets.find(t => t._id === id);

  const lista = document.getElementById("listadoHistorial");
  lista.innerHTML = "";

  if (!ticket || ticket.historial.length === 0) {
    lista.innerHTML = `<p style="color:#9ca3af;font-size:13px;text-align:center;padding:16px 0;">No hay historial registrado.</p>`;
    return;
  }

  // Mostrar del más reciente al más antiguo
  const historial = [...ticket.historial].reverse();

  historial.forEach((h, i) => {
    const div = document.createElement("div");
    div.className = "historial-item";

    // Color según el valor nuevo
    let colorClase = "";
    if (h.campo === "estado") {
      colorClase = h.valorNuevo === "Cerrado" ? "historial-cerrado" : "historial-abierto";
    }

    div.innerHTML = `
      <div class="historial-línea ${i < historial.length - 1 ? "historial-línea-conectar" : ""}">
        <div class="historial-punto ${colorClase}"></div>
      </div>
      <div class="historial-contenido">
        <div class="historial-meta">
          <span class="historial-quien">👤 ${h.hechoPor}</span>
          <span class="historial-fecha">${new Date(h.createdAt).toLocaleString()}</span>
        </div>
        <div class="historial-cambio">
          <span class="historial-campo">${h.campo}</span>
          <span class="historial-valor-anterior">${h.valorAnterior}</span>
          <span class="historial-flecha">→</span>
          <span class="historial-valor-nuevo ${colorClase}">${h.valorNuevo}</span>
        </div>
      </div>
    `;

    lista.appendChild(div);
  });
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
