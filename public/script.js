// =============================
// FECHAS
// =============================
const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const mesSelect = document.getElementById("mes");
const anioSelect = document.getElementById("anio");

const hoy = new Date();
const anioActual = hoy.getFullYear();

meses.forEach((m, i) => {
  const opt = document.createElement("option");
  opt.value = i + 1;
  opt.textContent = m;
  if (i === hoy.getMonth()) opt.selected = true;
  mesSelect.appendChild(opt);
});

for (let a = anioActual - 1; a <= anioActual + 1; a++) {
  const opt = document.createElement("option");
  opt.value = a;
  opt.textContent = a;
  if (a === anioActual) opt.selected = true;
  anioSelect.appendChild(opt);
}

// =============================
// CONSULTAR REPORTE
// =============================
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

// =============================
// EXPORTAR
// =============================
function exportar() {
  const mes = mesSelect.value;
  const anio = anioSelect.value;
  window.location.href = `/exportar-csv?mes=${mes}&anio=${anio}`;
}

// =============================
// LOGOUT
// =============================
async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

// INIT
consultar();