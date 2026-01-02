const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const mesSelect = document.getElementById("mes");
const anioSelect = document.getElementById("anio");

const hoy = new Date();
const anioActual = hoy.getFullYear();

meses.forEach((m, i) => {
  const o = document.createElement("option");
  o.value = i + 1;
  o.textContent = m;
  mesSelect.appendChild(o);
});

for (let a = anioActual - 1; a <= anioActual + 1; a++) {
  const o = document.createElement("option");
  o.value = a;
  o.textContent = a;
  anioSelect.appendChild(o);
}

async function consultar() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;

  const res = await fetch(`/reporte-cerrados?mes=${mes}&anio=${anio}`);
  const data = await res.json();

  document.getElementById("totalCerrados").innerText = data.totalCerrados;

  const tbody = document.getElementById("tablaCerrados");
  tbody.innerHTML = "";

  Object.entries(data.porCategoria).forEach(([cat, total]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${cat}</td><td>${total}</td>`;
    tbody.appendChild(tr);
  });
}

function exportar() {
  window.location.href = `/exportar-csv?mes=${mesSelect.value}&anio=${anioSelect.value}`;
}

async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

consultar();

async function eliminarMasivo() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;

  if (!confirm(`⚠️ ATENCIÓN\n\nSe eliminarán TODOS los tickets del mes ${mes}/${anio}.\n\n¿Deseas continuar?`)) {
    return;
  }

  const res = await fetch(`/tickets-masivo?mes=${mes}&anio=${anio}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    alert("❌ No autorizado o error");
    return;
  }

  const data = await res.json();

  alert(`✅ Tickets eliminados: ${data.eliminados}`);

  consultar();
}