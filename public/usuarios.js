// =====================
// CARGAR USUARIOS
// =====================
async function cargarUsuarios() {
  const res = await fetch("/usuarios");

  if (!res.ok) {
    // Si no es IT, redirigir (no debería llegar aquí, pero por si acaso)
    location.href = "/";
    return;
  }

  const usuarios = await res.json();
  const tbody = document.getElementById("tablaUsuarios");
  tbody.innerHTML = "";

  if (usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:24px;">No hay usuarios.</td></tr>`;
    return;
  }

  // Obtener quién está logueado para no permitir eliminarse a sí mismo
  const meRes = await fetch("/me");
  const me = await meRes.json();

  usuarios.forEach(u => {
    const tr = document.createElement("tr");
    const esYo = u.usuario === me.usuario;

    tr.innerHTML = `
      <td>
        <span class="usuario-nombre">👤 ${u.usuario}</span>
        ${esYo ? '<span class="etiqueta-yo">Tú</span>' : ""}
      </td>
      <td><span class="badge-rol badge-rol-${u.rol.toLowerCase()}">${u.rol}</span></td>
      <td>
        ${esYo
          ? `<span class="no-eliminar">No puedes eliminarte</span>`
          : `<button class="btn-eliminar" onclick="eliminarUsuario('${u._id}', '${u.usuario}')">🗑️ Eliminar</button>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// =====================
// CREAR USUARIO
// =====================
async function crearUsuario() {
  const usuario = document.getElementById("nuUsuario").value.trim();
  const password = document.getElementById("nuPassword").value;
  const rol = document.getElementById("nuRol").value;
  const msg = document.getElementById("msgUsuarios");

  // Validaciones en el frontend
  if (!usuario) {
    mostrarMsg("Escribe un nombre de usuario", "error");
    return;
  }

  if (!password || password.length < 4) {
    mostrarMsg("La contraseña debe tener al menos 4 caracteres", "error");
    return;
  }

  // Verificar caracteres válidos en el nombre de usuario
  if (!/^[a-zA-Z0-9._-]+$/.test(usuario)) {
    mostrarMsg("El usuario solo puede tener letras, números, puntos, guiones o guiones bajos", "error");
    return;
  }

  const res = await fetch("/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password, rol })
  });

  const data = await res.json();

  if (!res.ok) {
    mostrarMsg(data.error || "Error al crear usuario", "error");
    return;
  }

  // Éxito
  mostrarMsg(`✅ Usuario "${usuario}" creado correctamente`, "exito");

  // Limpiar formulario
  document.getElementById("nuUsuario").value = "";
  document.getElementById("nuPassword").value = "";
  document.getElementById("nuRol").value = "USER";

  // Recargar tabla
  cargarUsuarios();
}

// =====================
// ELIMINAR USUARIO
// =====================
async function eliminarUsuario(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar al usuario "${nombre}"?\n\nEsta acción no puede deshacerse.`)) return;

  const res = await fetch(`/usuarios/${id}`, { method: "DELETE" });
  const data = await res.json();

  if (!res.ok) {
    mostrarMsg(data.error || "Error al eliminar", "error");
    return;
  }

  mostrarMsg(`✅ Usuario "${nombre}" eliminado`, "exito");
  cargarUsuarios();
}

// =====================
// MOSTRAR MENSAJE
// =====================
function mostrarMsg(texto, tipo) {
  const msg = document.getElementById("msgUsuarios");
  msg.innerText = texto;
  msg.className = tipo === "exito" ? "msg-exito" : "msg-error";
  msg.style.display = "block";

  // Desaparece después de 4 segundos
  setTimeout(() => { msg.style.display = "none"; }, 4000);
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
cargarUsuarios();
