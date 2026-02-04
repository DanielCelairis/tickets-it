const tabla = document.getElementById("tablaTickets");
const form = document.getElementById("formTicket");

let ticketActualId = null;
let ticketTiempoId = null;
let nuevoEstadoTiempo = null;

// =====================
// SUBCATEGORÍAS POR CATEGORÍA
// =====================
const SUBCATEGORIAS = {
  "Isoft": [
    "Creación de usuario",
    "Desbloqueo de usuario",
    "Deshabilitar usuario"
  ],
  "Emesmart": [
    "Creación de usuario",
    "Desbloqueo de usuario",
    "Creación de PDV",
    "Asignación de PDV",
    "Creación de circuito",
    "Creación de ruta",
    "Restablecer coordenadas de PDV",
    "Deshabilitar usuario",
    "Deshabilitar PDV",
    "Asignación de QR",
    "Actualización de PDV",
    "Creación de producto",
    "Creación de grupo",
    "Asignación de precio o alias",
    "Revisión de seriales",
    "Revisión de caja",
    "Revisión de facturas",
    "Fallas otras",
    "Requerimiento otros"
  ],
  "Correo": [
    "Creación de correo",
    "Deshabilitar correo",
    "Restablecer contraseña",
    "Respaldo de correos",
    "Configuración otras"
  ],
  "Redes": [
    "Falla en la red"
  ],
  "Telefonia": [
    "Fallas otras del teléfono",
    "Requerimientos otros del teléfono"
  ],
  "Kommo": [
    "Creación de usuario",
    "Deshabilitar usuario",
    "Reinicio de contraseña",
    "Configuración Salesbot",
    "Configuración automatiza",
    "Fallas otras",
    "Requerimientos otros"
  ],
  "SIG": [
    "Creación de usuario",
    "Deshabilitar usuario",
    "Creación de grupo",
    "Revisión de seriales",
    "Revisión de caja",
    "Revisión de facturas",
    "Fallas otras",
    "Requerimiento otros"
  ],
  "Fiscal": [
    "Creación de cliente",
    "Creación de fiscal",
    "Fallas otras",
    "Requerimiento otros"
  ],
  "GDS (KrediYA)": [
    "Creación de usuario",
    "Deshabilitar usuario"
  ],
  "DMS": [
    "Creación de usuario",
    "Restablecer contraseña de usuario",
    "Legalización de PDV",
    "Asignación de PDV",
    "Creación de circuito",
    "Creación de ruta",
    "Deshabilitar usuario",
    "Deshabilitar PDV",
    "Actualización de PDV",
    "Asignación de precio o alias",
    "Revisión de seriales",
    "Revisión de caja",
    "Revisión de facturas",
    "Fallas otras",
    "Requerimiento otros"
  ],
  "Soporte Tecnico": [
    "Fallas Hardware",
    "Requerimiento de Hardware",
    "Fallas Software",
    "Requerimiento Software"
  ],
  "Compras": [
    "Mouse",
    "UPS",
    "Laptop",
    "Monitor",
    "Teclado",
    "Reparación de laptop"
  ]
};

// =====================
// ACTUALIZAR SUBCATEGORÍAS DINÁMICAMENTE
// =====================
function actualizarSubcategorias() {
  const categoria = document.getElementById("categoria").value;
  const subSelect = document.getElementById("subcategoria");

  // Limpiar opciones anteriores
  subSelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';

  if (categoria && SUBCATEGORIAS[categoria]) {
    subSelect.disabled = false;
    SUBCATEGORIAS[categoria].forEach(sub => {
      const option = document.createElement("option");
      option.value = sub;
      option.textContent = sub;
      subSelect.appendChild(option);
    });
  } else {
    subSelect.disabled = true;
  }
}

// Listener para cambio de categoría
document.getElementById("categoria").addEventListener("change", actualizarSubcategorias);

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
    tabla.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:30px;">No hay tickets que coincidan con los filtros.</td></tr>`;
    return;
  }

  tickets.forEach(t => {
    const tr = document.createElement("tr");

    if (t.prioridad === "Alta" && t.estado === "Abierto") {
      tr.className = "fila-alta-prioridad";
    }

    let estadoClase = "abierto";
    if (t.estado === "Cerrado") estadoClase = "cerrado";
    else if (t.estado === "Pendiente Usuario") estadoClase = "pendiente-usuario";
    else if (t.estado === "Pendiente Proveedor") estadoClase = "pendiente-proveedor";

    tr.innerHTML = `
      <td><span class="badge badge-${t.tipo.toLowerCase()}">${t.tipo}</span></td>
      <td>${t.categoria}</td>
      <td><span class="subcategoria-tag">${t.subcategoria || "—"}</span></td>
      <td>${t.descripcion}</td>
      <td><span class="badge-prioridad prioridad-${t.prioridad.toLowerCase()}">${t.prioridad === "Alta" ? "🔴" : t.prioridad === "Media" ? "🟡" : "🟢"} ${t.prioridad}</span></td>
      <td><span class="usuario-tag">👤 ${t.creadoPor || "—"}</span></td>
      <td>
        <select onchange="cambiarEstado('${t._id}', this.value)" class="select-estado ${estadoClase}">
          <option value="Abierto" ${t.estado === "Abierto" ? "selected" : ""}>Abierto</option>
          <option value="Cerrado" ${t.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
          <option value="Pendiente Usuario" ${t.estado === "Pendiente Usuario" ? "selected" : ""}>Pendiente Usuario</option>
          <option value="Pendiente Proveedor" ${t.estado === "Pendiente Proveedor" ? "selected" : ""}>Pendiente Proveedor</option>
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

function getFiltros() {
  return {
    estado: document.getElementById("filtroEstado").value,
    categoria: document.getElementById("filtroCategoria").value,
    buscar: document.getElementById("buscar").value.trim(),
    prioridad: document.getElementById("filtroPrioridad").value
  };
}

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
  if (estado === "Cerrado") {
    ticketTiempoId = id;
    nuevoEstadoTiempo = estado;
    document.getElementById("modalTiempo").style.display = "flex";
    document.getElementById("inputHoras").value = "";
    document.getElementById("inputMinutos").value = "";
    document.getElementById("inputHoras").focus();
    return;
  }

  await enviarCambioEstado(id, estado, null);
}

async function enviarCambioEstado(id, estado, tiempoGestion) {
  const body = { id, estado };
  if (tiempoGestion) body.tiempoGestion = tiempoGestion;

  const res = await fetch("/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    alert("❌ No autorizado para cambiar estado");
    return;
  }

  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
}

// =====================
// MODAL TIEMPO
// =====================
function cerrarModalTiempo() {
  document.getElementById("modalTiempo").style.display = "none";
  ticketTiempoId = null;
  nuevoEstadoTiempo = null;
  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
}

async function confirmarTiempo() {
  const horas = parseInt(document.getElementById("inputHoras").value) || 0;
  const minutos = parseInt(document.getElementById("inputMinutos").value) || 0;

  if (horas === 0 && minutos === 0) {
    alert("Por favor ingresa al menos 1 minuto");
    return;
  }

  if (minutos > 59) {
    alert("Los minutos deben ser entre 0 y 59");
    return;
  }

  const totalMinutos = (horas * 60) + minutos;

  await enviarCambioEstado(ticketTiempoId, nuevoEstadoTiempo, totalMinutos);
  document.getElementById("modalTiempo").style.display = "none";
  ticketTiempoId = null;
  nuevoEstadoTiempo = null;
}

document.addEventListener("DOMContentLoaded", () => {
  const inputHoras = document.getElementById("inputHoras");
  const inputMinutos = document.getElementById("inputMinutos");
  
  if (inputHoras) {
    inputHoras.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        inputMinutos.focus();
        inputMinutos.select();
      }
    });
  }
  
  if (inputMinutos) {
    inputMinutos.addEventListener("keypress", (e) => {
      if (e.key === "Enter") confirmarTiempo();
    });
  }
});

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

  const categoria = document.getElementById("categoria").value;
  const subcategoria = document.getElementById("subcategoria").value;

  if (!categoria) {
    alert("Por favor selecciona una categoría");
    return;
  }

  if (!subcategoria) {
    alert("Por favor selecciona una subcategoría");
    return;
  }

  await fetch("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: document.getElementById("tipo").value,
      categoria: categoria,
      subcategoria: subcategoria,
      descripcion: document.getElementById("descripcion").value,
      prioridad: document.getElementById("prioridad").value
    })
  });

  form.reset();
  document.getElementById("prioridad").value = "Media";
  document.getElementById("subcategoria").disabled = true;
  document.getElementById("subcategoria").innerHTML = '<option value="">Seleccionar subcategoría</option>';

  const f = getFiltros();
  cargarTickets(f.estado, f.categoria, f.buscar, f.prioridad);
});

// =====================
// MODAL COMENTARIOS/HISTORIAL
// =====================
function abrirModal(id, descripcion) {
  ticketActualId = id;
  document.getElementById("modalDescripcion").innerText = `📌 ${descripcion}`;
  document.getElementById("modalComentarios").style.display = "flex";
  cambiarTab("comentarios");
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

function cambiarTab(pestaña) {
  document.getElementById("tabComentarios").className = "tab-btn" + (pestaña === "comentarios" ? " tab-activo" : "");
  document.getElementById("tabHistorial").className   = "tab-btn" + (pestaña === "historial"   ? " tab-activo" : "");
  document.getElementById("contenidoComentarios").style.display = pestaña === "comentarios" ? "flex" : "none";
  document.getElementById("contenidoHistorial").style.display   = pestaña === "historial"   ? "block" : "none";
}

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

  const historial = [...ticket.historial].reverse();

  historial.forEach((h, i) => {
    const div = document.createElement("div");
    div.className = "historial-item";

    let colorClase = "";
    if (h.campo === "estado") {
      if (h.valorNuevo === "Cerrado") colorClase = "historial-cerrado";
      else if (h.valorNuevo === "Abierto") colorClase = "historial-abierto";
      else if (h.valorNuevo === "Pendiente Usuario") colorClase = "historial-pendiente-usuario";
      else if (h.valorNuevo === "Pendiente Proveedor") colorClase = "historial-pendiente-proveedor";
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

async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

cargarTickets();
