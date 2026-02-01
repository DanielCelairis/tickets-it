const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const mesSelect = document.getElementById("mes");
const anioSelect = document.getElementById("anio");

const hoy = new Date();
const anioActual = hoy.getFullYear();

// Poblar selects
meses.forEach((m, i) => {
  const o = document.createElement("option");
  o.value = i + 1;
  o.textContent = m;
  if (i === hoy.getMonth()) o.selected = true;
  mesSelect.appendChild(o);
});

for (let a = anioActual - 1; a <= anioActual + 1; a++) {
  const o = document.createElement("option");
  o.value = a;
  o.textContent = a;
  if (a === anioActual) o.selected = true;
  anioSelect.appendChild(o);
}

// =====================
// CONSULTAR DATOS
// =====================
async function consultar() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;

  // Las 3 peticiones en paralelo
  const [resCerrados, resAbiertos, resPrioridades] = await Promise.all([
    fetch(`/reporte-cerrados?mes=${mes}&anio=${anio}`),
    fetch(`/reporte-abiertos?mes=${mes}&anio=${anio}`),
    fetch(`/reporte-prioridades?mes=${mes}&anio=${anio}`)
  ]);

  const cerrados = await resCerrados.json();
  const abiertos = await resAbiertos.json();
  const prioridades = await resPrioridades.json();

  const totalCerrados = cerrados.totalCerrados;
  const totalAbiertos = abiertos.totalAbiertos;
  const totalTickets = totalCerrados + totalAbiertos;

  // KPIs principales
  document.getElementById("totalCerrados").innerText = totalCerrados;
  document.getElementById("totalAbiertos").innerText = totalAbiertos;
  document.getElementById("totalAlta").innerText = prioridades.Alta;
  document.getElementById("totalTickets").innerText = totalTickets;

  // Cartas de prioridad
  document.getElementById("priAalta").innerText = prioridades.Alta;
  document.getElementById("priMedia").innerText = prioridades.Media;
  document.getElementById("priBaja").innerText = prioridades.Baja;

  // Tabla de categorías
  const tbody = document.getElementById("tablaCerrados");
  tbody.innerHTML = "";

  const categorias = Object.entries(cerrados.porCategoria);

  if (categorias.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#9ca3af;">No hay datos para este mes.</td></tr>`;
  } else {
    categorias.forEach(([cat, total]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${cat}</td><td><strong>${total}</strong></td>`;
      tbody.appendChild(tr);
    });
  }

  // Gráfico pie
  dibujarPieChart(categorias);
}

// =====================
// PIE CHART (canvas nativo)
// =====================
const COLORES = [
  "#2563eb", "#6366f1", "#ec4899", "#f59e0b",
  "#10b981", "#ef4444", "#8b5cf6", "#06b6d4",
  "#84cc16", "#f97316", "#14b8a6", "#e11d48"
];

function dibujarPieChart(categorias) {
  const canvas = document.getElementById("graficoPie");
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 20;

  ctx.clearRect(0, 0, size, size);

  if (categorias.length === 0) {
    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos", center, center);
    return;
  }

  const total = categorias.reduce((s, [, v]) => s + v, 0);
  let ángulo = -Math.PI / 2;

  categorias.forEach(([cat, valor], i) => {
    const proporción = valor / total;
    const arcoFinal = ángulo + proporción * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, ángulo, arcoFinal);
    ctx.closePath();
    ctx.fillStyle = COLORES[i % COLORES.length];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (proporción > 0.08) {
      const midÁngulo = ángulo + (arcoFinal - ángulo) / 2;
      const labelR = radius * 0.6;
      const lx = center + Math.cos(midÁngulo) * labelR;
      const ly = center + Math.sin(midÁngulo) * labelR;

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(proporción * 100)}%`, lx, ly);
    }

    ángulo = arcoFinal;
  });
}

// =====================
// EXPORTAR CSV
// =====================
function exportar() {
  window.location.href = `/exportar-csv?mes=${mesSelect.value}&anio=${anioSelect.value}`;
}

// =====================
// ELIMINAR MASIVO
// =====================
async function eliminarMasivo() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;

  if (!confirm(`⚠️ ATENCIÓN\n\nSe eliminarán TODOS los tickets del mes ${meses[mes - 1]} / ${anio}.\n\n¿Deseas continuar?`)) return;

  const res = await fetch(`/tickets-masivo?mes=${mes}&anio=${anio}`, { method: "DELETE" });

  if (!res.ok) {
    alert("❌ No autorizado o error");
    return;
  }

  const data = await res.json();
  alert(`✅ Tickets eliminados: ${data.eliminados}`);
  consultar();
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
consultar();
