const { Client, Pool } = require('pg');

// Endpoint para verificar y crear la base de datos si no existe
app.post('/api/setup-db', async (req, res) => {
  // Configuración para conectarse a la BD del sistema por defecto 'postgres'
  const configPostgres = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Nos conectamos a 'postgres' por defecto
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  };

  const clientSys = new Client(configPostgres);

  try {
    await clientSys.connect();

    // 1. Verificar si la BD ya existe
    const checkDb = await clientSys.query(
      "SELECT 1 FROM pg_database WHERE datname = 'gestion_usuarios_db'"
    );

    if (checkDb.rows.length === 0) {
      // 2. Crear la Base de Datos si no existe
      await clientSys.query('CREATE DATABASE gestion_usuarios_db');
      console.log('Base de datos gestion_usuarios_db creada con éxito.');
    }
    await clientSys.end(); // Cerramos la conexión con 'postgres'

    // 3. Conectarse a la BD recién creada para estructurar las tablas y scripts
    const poolNuevaBD = new Pool({
      ...configPostgres,
      database: 'gestion_usuarios_db'
    });

    const scriptSQL = `
      -- 1. Tabla de Roles
      CREATE TABLE IF NOT EXISTS roles (
          rol_id SERIAL PRIMARY KEY,
          nombre_rol VARCHAR(30) UNIQUE NOT NULL
      );

      -- 2. Tabla de Usuarios
      CREATE TABLE IF NOT EXISTS usuarios (
          usuario_id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          rol_id INT REFERENCES roles(rol_id),
          estado VARCHAR(15) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO', 'BLOQUEADO')),
          intentos_fallidos INT DEFAULT 0,
          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Historial de Accesos
      CREATE TABLE IF NOT EXISTS historial_accesos (
          acceso_id SERIAL PRIMARY KEY,
          usuario_id INT REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
          ip_origen VARCHAR(45) NOT NULL,
          exitoso BOOLEAN NOT NULL,
          fecha_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Datos Iniciales de Prueba
      INSERT INTO roles (nombre_rol) VALUES ('Administrador'), ('Cliente'), ('Soporte')
      ON CONFLICT (nombre_rol) DO NOTHING;

      INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES
      ('Ana Gómez', 'ana@web.com', 'hash_pass_123', 1),
      ('Carlos Ruiz', 'carlos@web.com', 'hash_pass_456', 2)
      ON CONFLICT (email) DO NOTHING;

      -- Tabla de Auditoría y Triggers
      CREATE TABLE IF NOT EXISTS auditoria_usuarios (
          audit_id SERIAL PRIMARY KEY,
          usuario_id INT,
          estado_anterior VARCHAR(15),
          estado_nuevo VARCHAR(15),
          fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE OR REPLACE FUNCTION fn_trg_auditar_estado_usuario()
      RETURNS TRIGGER AS $$
      BEGIN
          IF OLD.estado IS DISTINCT FROM NEW.estado THEN
              INSERT INTO auditoria_usuarios (usuario_id, estado_anterior, estado_nuevo)
              VALUES (OLD.usuario_id, OLD.estado, NEW.estado);
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_auditar_estado_usuario ON usuarios;
      CREATE TRIGGER trg_auditar_estado_usuario
      AFTER UPDATE ON usuarios
      FOR EACH ROW
      EXECUTE FUNCTION fn_trg_auditar_estado_usuario();

      -- Procedimiento para desbloquear
      CREATE OR REPLACE PROCEDURE sp_desbloquear_usuario(p_usuario_id INT)
      LANGUAGE plpgsql
      AS $$
      BEGIN
          UPDATE usuarios
          SET estado = 'ACTIVO', intentos_fallidos = 0
          WHERE usuario_id = p_usuario_id;
      END;
      $$;
    `;

    await poolNuevaBD.query(scriptSQL);
    await poolNuevaBD.end();

    return res.json({
      exito: true,
      mensaje: 'Base de datos y estructura creadas correctamente.'
    });

  } catch (error) {
    if (clientSys) await clientSys.end().catch(() => {});
    return res.status(500).json({ exito: false, mensaje: error.message });
  }
});