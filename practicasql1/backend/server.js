require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos PostgreSQL en mi puerto
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.post('/api/registro', async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES ($1, $2, $3, $4) RETURNING usuario_id, nombre, email',
      [nombre, email, password, rol_id || 2] // Rol 2 = Cliente por defecto
    );
    res.json({ exito: true, usuario: result.rows[0] });
  } catch (error) {
    res.status(400).json({ exito: false, mensaje: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password, ip } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    const usuario = userRes.rows[0];

    if (usuario.estado === 'BLOQUEADO') {
      await client.query('ROLLBACK');
      return res.status(403).json({ exito: false, mensaje: 'Usuario bloqueado por múltiples intentos fallidos.' });
    }

    if (usuario.password_hash === password) {
      
      await client.query('UPDATE usuarios SET intentos_fallidos = 0 WHERE usuario_id = $1', [usuario.usuario_id]);
      await client.query('INSERT INTO historial_accesos (usuario_id, ip_origen, exitoso) VALUES ($1, $2, TRUE)', [usuario.usuario_id, ip || '127.0.0.1']);
      await client.query('COMMIT');
      
      return res.json({ exito: true, usuario: { id: usuario.usuario_id, nombre: usuario.nombre, email: usuario.email } });
    } else {
      
      const nuevosIntentos = usuario.intentos_fallidos + 1;
      let nuevoEstado = usuario.estado;
      
      if (nuevosIntentos >= 3) {
        nuevoEstado = 'BLOQUEADO';
      }

      await client.query('UPDATE usuarios SET intentos_fallidos = $1, estado = $2 WHERE usuario_id = $3', [nuevosIntentos, nuevoEstado, usuario.usuario_id]);
      await client.query('INSERT INTO historial_accesos (usuario_id, ip_origen, exitoso) VALUES ($1, $2, FALSE)', [usuario.usuario_id, ip || '127.0.0.1']);
      await client.query('COMMIT');

      return res.status(401).json({ 
        exito: false, 
        mensaje: nuevoEstado === 'BLOQUEADO' ? 'Cuenta bloqueada tras 3 intentos fallidos.' : `Contraseña incorrecta. Llevas ${nuevosIntentos} intento(s).` 
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false, mensaje: error.message });
  } finally {
    client.release();
  }
});


app.post('/api/desbloquear', async (req, res) => {
  const { usuario_id } = req.body;
  try {
    await pool.query('CALL sp_desbloquear_usuario($1)', [usuario_id]);
    res.json({ exito: true, mensaje: 'Usuario desbloqueado con éxito' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Backend corriendo en http://localhost:${process.env.PORT}`);
});