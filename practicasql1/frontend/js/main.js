const API_URL = 'http://localhost:3000/api';

// Enrutador sencillo para cargar las vistas dentro de views/
async function cargarVista(vista) {
  const container = document.getElementById('app-view');
  try {
    const res = await fetch(`views/${vista}.html`);
    const html = await res.text();
    container.innerHTML = html;

    // Asignar listeners según la vista cargada
    if (vista === 'login') asociarEventoLogin();
    if (vista === 'registro') asociarEventoRegistro();
    if (vista === 'dashboard') cargarDatosDashboard();
  } catch (err) {
    container.innerHTML = '<p>Error al cargar la vista.</p>';
  }
}

function asociarEventoLogin() {
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const msg = document.getElementById('login-msg');

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ip: '127.0.0.1' })
    });

    const data = await res.json();
    if (data.exito) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      actualizarHeader();
      cargarVista('dashboard');
    } else {
      msg.style.color = 'red';
      msg.textContent = data.mensaje;
    }
  });
}

function asociarEventoRegistro() {
  document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol_id = document.getElementById('reg-rol').value;
    const msg = document.getElementById('reg-msg');

    const res = await fetch(`${API_URL}/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol_id })
    });

    const data = await res.json();
    if (data.exito) {
      msg.style.color = 'green';
      msg.textContent = '¡Usuario registrado con éxito! Redirigiendo a Login...';
      setTimeout(() => cargarVista('login'), 1500);
    } else {
      msg.style.color = 'red';
      msg.textContent = data.mensaje;
    }
  });
}

function cargarDatosDashboard() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (usuario) {
    document.getElementById('dash-usuario').textContent = `${usuario.nombre} (${usuario.email})`;
  } else {
    cargarVista('login');
  }
}

function actualizarHeader() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const userDisplay = document.getElementById('user-display');
  const btnLogout = document.getElementById('btn-logout');

  if (usuario) {
    userDisplay.textContent = usuario.nombre;
    btnLogout.classList.remove('hidden');
  } else {
    userDisplay.textContent = 'Invitado';
    btnLogout.classList.add('hidden');
  }
}

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('usuario');
  actualizarHeader();
  cargarVista('login');
});

// Cargar Login por defecto al iniciar
cargarVista('login');
actualizarHeader();