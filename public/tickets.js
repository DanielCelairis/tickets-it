const tabla = document.getElementById("tablaTickets");
const form = document.getElementById("formTicket");

async function cargarTickets() {
  const res = await fetch("/tickets");
  const tickets = await res.json();

  tabla.innerHTML = "";

  tickets.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.tipo}</td>
      <td>${t.categoria}</td>
      <td>${t.descripcion}</td>
      <td>${t.estado}</td>
      <td></td>
    `;
    tabla.appendChild(tr);
  });
}

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
  cargarTickets();
});

async function logout() {
  await fetch("/logout", { method: "POST" });
  location.href = "/login.html";
}

cargarTickets();