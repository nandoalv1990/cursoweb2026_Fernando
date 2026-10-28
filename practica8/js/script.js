const loginForm = document.getElementById('login-form');
const btnCreateAccount = document.getElementById('btn-create-account');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (email && password) {
        alert(`[SIMULACIÓN EN CLASE]\nIntento de inicio de sesión recibido:\nUsuario: ${email}`);
    }
});

btnCreateAccount.addEventListener('click', () => {
    alert('[SIMULACIÓN EN CLASE]\nAquí se abriría la ventana emergente para crear una cuenta nueva.');
});