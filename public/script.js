// =============================
// CONFIG FECHAS
// =============================
const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const mesSelect = document.getElementById("mes");
const anioSelect = document.getElementById("anio");

const hoy = new Date();
const anioActual = hoy.getFullYear();

// Cargar meses
meses.forEach((m, i) => {
  const opt = document.createElement("option");
  opt.value = i + 1;
  opt.textContent = m;
  if (i === hoy.getMonth()) opt.selected = true;
  mesSelect.appendChild(opt);
});

// Cargar años
for (let a = anioActual - 2; a <= anioActual + 1; a++) {
  const opt = document.createElement("option");
  opt.value = a;
  opt.textContent = a;
  if (a === anioActual) opt.selected = true;
  anioSelect.appendChild(opt);
}

// =============================
// VARIABLES GRÁFICOS
// =============================
let chartEstado = null;
let chartCategorias = null;

// =============================
// CARGAR DASHBOARD
// =============================
async function cargarDashboard() {
  const res = await fetch("/tickets");
  const tickets = await res.json();

  const mes = Number(mesSelect.value);
  const anio = Number(anioSelect.value);

  let total = 0;
  let abiertos = 0;
  let cerrados = 0;

  const resumenCategorias = {};

  const tbody = document.getElementById("tabla");
  tbody.innerHTML = "";

  tickets.forEach(t => {
    const fecha = new Date(t.createdAt);

    if (
      fecha.getMonth() + 1 !== mes ||
      fecha.getFullYear() !== anio
    ) return;

    total++;

    if (t.estado === "Cerrado") {
      cerrados++;
      resumenCategorias[t.categoria] =
        (resumenCategorias[t.categoria] || 0) + 1;
    } else {
      abiertos++;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.tipo}</td>
      <td>${t.categoria}</td>
      <td>${t.descripcion}</td>
      <td>
        <span class="estado ${t.estado === "Cerrado" ? "cerrado" : "abierto"}">
          ${t.estado}
        </span>
      </td>
      <td>${fecha.toLocaleDateString()}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("total").innerText = total;
  document.getElementById("abiertos").innerText = abiertos;
  document.getElementById("cerrados").innerText = cerrados;

  renderCharts(abiertos, cerrados, resumenCategorias);
}

// =============================
// RENDER GRÁFICOS
// =============================
function renderCharts(abiertos, cerrados, porCategoria) {

  // --- GRÁFICO ESTADO ---
  if (chartEstado) chartEstado.destroy();

  chartEstado = new Chart(
    document.getElementById("chartEstado"),
    {
      type: "doughnut",
      data: {
        labels: ["Abiertos", "Cerrados"],
        datasets: [{
          data: [abiertos, cerrados],
          backgroundColor: ["#6366f1", "#1e40af"]
        }]
      },
      options: {
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    }
  );

  // --- GRÁFICO CATEGORÍAS ---
  if (chartCategorias) chartCategorias.destroy();

  chartCategorias = new Chart(
    document.getElementById("chartCategorias"),
    {
      type: "bar",
      data: {
        labels: Object.keys(porCategoria),
        datasets: [{
          label: "Tickets Cerrados",
          data: Object.values(porCategoria),
          backgroundColor: "#1e40af"
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        }
      }
    }
  );
}

// =============================
// EXPORTAR CSV
// =============================
function exportar() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;
  window.location.href = `/exportar-csv?mes=${mes}&anio=${anio}`;
}

// =============================
// ELIMINAR CERRADOS
// =============================
async function eliminar() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;

  if (!confirm("⚠️ Se eliminarán TODOS los tickets cerrados del mes.\n¿Continuar?")) {
    return;
  }

  const res = await fetch("/eliminar-cerrados", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mes, anio })
  });

  const data = await res.json();
  alert(`✅ Eliminados: ${data.eliminados}`);
  cargarDashboard();
}

// =============================
// LOGOUT
// =============================
async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

// =============================
// EVENTOS
// =============================
mesSelect.addEventListener("change", cargarDashboard);
anioSelect.addEventListener("change", cargarDashboard);

// INIT
cargarDashboard();