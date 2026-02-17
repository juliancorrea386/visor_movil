// src/database/db.js
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('cotizaciones.db');

/**
 * Inicializa la base de datos local
 */
export const initDatabase = async () => {
  try {
    // Tabla de cotizaciones
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        id_servidor INTEGER,
        numero_cotizacion TEXT NOT NULL,
        fecha TEXT NOT NULL,
        cliente_id TEXT NOT NULL,
        cliente_nombre TEXT,
        cliente_telefono TEXT,
        cliente_municipio TEXT,
        tipo TEXT NOT NULL,
        subtotal REAL NOT NULL,
        total REAL NOT NULL,
        saldo REAL DEFAULT 0,
        sincronizado INTEGER DEFAULT 0,
        fecha_sincronizacion TEXT,
        observaciones TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de detalles de cotización
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cotizacion_detalles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cotizacion_id_local INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        producto_nombre TEXT,
        producto_referencia TEXT,
        cantidad INTEGER NOT NULL,
        precio_venta REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (cotizacion_id_local) REFERENCES cotizaciones(id_local) ON DELETE CASCADE
      );
    `);

    // Cache de productos
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS productos_cache (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio_venta REAL NOT NULL,
        Referencia TEXT,
        stock INTEGER DEFAULT 0,
        actualizado_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cache de clientes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS clientes_cache (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        municipio TEXT,
        actualizado_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cache de municipios
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS municipios_cache (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL
      );
    `);

    // Tabla de configuración
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `);

    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
};

// ==================== COTIZACIONES ====================

/**
 * Guarda una nueva cotización
 */
export const guardarCotizacion = async (cotizacion) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO cotizaciones 
       (numero_cotizacion, fecha, cliente_id, cliente_nombre, cliente_telefono, 
        cliente_municipio, tipo, subtotal, total, saldo, observaciones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cotizacion.numero_cotizacion,
        cotizacion.fecha,
        cotizacion.cliente_id,
        cotizacion.cliente_nombre,
        cotizacion.cliente_telefono,
        cotizacion.cliente_municipio,
        cotizacion.tipo,
        cotizacion.subtotal,
        cotizacion.total,
        cotizacion.tipo === 'credito' ? cotizacion.total : 0,
        cotizacion.observaciones || ''
      ]
    );

    const cotizacionId = result.lastInsertRowId;

    // Guardar detalles
    for (const producto of cotizacion.productos) {
      await db.runAsync(
        `INSERT INTO cotizacion_detalles 
         (cotizacion_id_local, producto_id, producto_nombre, producto_referencia, 
          cantidad, precio_venta, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cotizacionId,
          producto.producto_id,
          producto.nombre,
          producto.referencia,
          producto.cantidad,
          producto.precio_venta,
          producto.cantidad * producto.precio_venta
        ]
      );
    }

    console.log(`✅ Cotización ${cotizacion.numero_cotizacion} guardada`);
    return cotizacionId;
  } catch (error) {
    console.error('❌ Error guardando cotización:', error);
    throw error;
  }
};

/**
 * Obtiene todas las cotizaciones
 */
export const obtenerCotizaciones = async () => {
  try {
    const cotizaciones = await db.getAllAsync(`
      SELECT * FROM cotizaciones 
      ORDER BY fecha DESC, id_local DESC
    `);

    // Obtener productos de cada cotización
    for (const cot of cotizaciones) {
      cot.productos = await db.getAllAsync(
        `SELECT * FROM cotizacion_detalles WHERE cotizacion_id_local = ?`,
        [cot.id_local]
      );
    }

    return cotizaciones;
  } catch (error) {
    console.error('❌ Error obteniendo cotizaciones:', error);
    return [];
  }
};

/**
 * Obtiene cotizaciones pendientes de sincronizar
 */
export const obtenerCotizacionesPendientes = async () => {
  try {
    const cotizaciones = await db.getAllAsync(`
      SELECT * FROM cotizaciones 
      WHERE sincronizado = 0 
      ORDER BY fecha ASC
    `);

    for (const cot of cotizaciones) {
      cot.productos = await db.getAllAsync(
        `SELECT producto_id, cantidad, precio_venta 
         FROM cotizacion_detalles 
         WHERE cotizacion_id_local = ?`,
        [cot.id_local]
      );
    }

    return cotizaciones;
  } catch (error) {
    console.error('❌ Error obteniendo pendientes:', error);
    return [];
  }
};

/**
 * Marca una cotización como sincronizada
 */
export const marcarComoSincronizada = async (idLocal, idServidor) => {
  try {
    await db.runAsync(
      `UPDATE cotizaciones 
       SET sincronizado = 1, 
           id_servidor = ?, 
           fecha_sincronizacion = datetime('now') 
       WHERE id_local = ?`,
      [idServidor, idLocal]
    );
    console.log(`✅ Cotización ${idLocal} marcada como sincronizada`);
  } catch (error) {
    console.error('❌ Error marcando como sincronizada:', error);
    throw error;
  }
};

/**
 * Obtiene una cotización por ID con sus detalles
 */
export const obtenerCotizacionPorId = async (idLocal) => {
  try {
    const cotizacion = await db.getFirstAsync(
      `SELECT * FROM cotizaciones WHERE id_local = ?`,
      [idLocal]
    );

    if (cotizacion) {
      cotizacion.productos = await db.getAllAsync(
        `SELECT * FROM cotizacion_detalles WHERE cotizacion_id_local = ?`,
        [idLocal]
      );
    }

    return cotizacion;
  } catch (error) {
    console.error('❌ Error obteniendo cotización:', error);
    return null;
  }
};

// ==================== PRODUCTOS ====================

/**
 * Guarda productos en cache
 */
export const guardarProductosCache = async (productos) => {
  try {
    await db.runAsync('DELETE FROM productos_cache');

    for (const prod of productos) {
      await db.runAsync(
        `INSERT INTO productos_cache (id, nombre, precio_venta, Referencia, stock) 
         VALUES (?, ?, ?, ?, ?)`,
        [prod.id, prod.nombre, prod.precio_venta, prod.Referencia, prod.stock || 0]
      );
    }

    console.log(`✅ ${productos.length} productos guardados en cache`);
  } catch (error) {
    console.error('❌ Error guardando productos:', error);
    throw error;
  }
};

/**
 * Obtiene productos del cache
 */
export const obtenerProductosCache = async (busqueda = '') => {
  try {
    let query = 'SELECT * FROM productos_cache';
    const params = [];

    if (busqueda) {
      query += ` WHERE nombre LIKE ? OR Referencia LIKE ?`;
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    query += ' ORDER BY nombre ASC LIMIT 100';

    return await db.getAllAsync(query, params);
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    return [];
  }
};

// ==================== CLIENTES ====================

/**
 * Guarda clientes en cache
 */
export const guardarClientesCache = async (clientes) => {
  try {
    await db.runAsync('DELETE FROM clientes_cache');

    for (const cliente of clientes) {
      await db.runAsync(
        `INSERT INTO clientes_cache (id, nombre, telefono, municipio) 
         VALUES (?, ?, ?, ?)`,
        [cliente.id, cliente.nombre, cliente.telefono, cliente.municipio]
      );
    }

    console.log(`✅ ${clientes.length} clientes guardados en cache`);
  } catch (error) {
    console.error('❌ Error guardando clientes:', error);
    throw error;
  }
};

/**
 * Obtiene clientes del cache
 */
export const obtenerClientesCache = async (busqueda = '') => {
  try {
    let query = 'SELECT * FROM clientes_cache';
    const params = [];

    if (busqueda) {
      query += ` WHERE nombre LIKE ? OR id LIKE ?`;
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    query += ' ORDER BY nombre ASC LIMIT 100';

    return await db.getAllAsync(query, params);
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    return [];
  }
};

/**
 * Guarda municipios en cache
 */
export const guardarMunicipiosCache = async (municipios) => {
  try {
    await db.runAsync('DELETE FROM municipios_cache');

    for (const mun of municipios) {
      await db.runAsync(
        `INSERT INTO municipios_cache (id, nombre) VALUES (?, ?)`,
        [mun.id, mun.nombre]
      );
    }

    console.log(`✅ ${municipios.length} municipios guardados`);
  } catch (error) {
    console.error('❌ Error guardando municipios:', error);
  }
};

/**
 * Obtiene municipios
 */
export const obtenerMunicipiosCache = async () => {
  try {
    return await db.getAllAsync('SELECT * FROM municipios_cache ORDER BY nombre ASC');
  } catch (error) {
    console.error('❌ Error obteniendo municipios:', error);
    return [];
  }
};

// ==================== CONFIGURACIÓN ====================

/**
 * Guarda un valor de configuración
 */
export const guardarConfiguracion = async (clave, valor) => {
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)`,
      [clave, valor]
    );
  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
  }
};

/**
 * Obtiene un valor de configuración
 */
export const obtenerConfiguracion = async (clave) => {
  try {
    const result = await db.getFirstAsync(
      `SELECT valor FROM configuracion WHERE clave = ?`,
      [clave]
    );
    return result ? result.valor : null;
  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error);
    return null;
  }
};

/**
 * Genera el siguiente número de cotización
 */
export const generarNumeroCotizacion = async () => {
  const year = new Date().getFullYear();
  const ultimaCot = await db.getFirstAsync(
    `SELECT numero_cotizacion FROM cotizaciones 
     WHERE numero_cotizacion LIKE ? 
     ORDER BY id_local DESC LIMIT 1`,
    [`${year}-%`]
  );

  if (ultimaCot) {
    const partes = ultimaCot.numero_cotizacion.split('-');
    const numero = parseInt(partes[1]) + 1;
    return `${year}-${numero.toString().padStart(3, '0')}`;
  }

  return `${year}-001`;
};

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene estadísticas del día
 */
export const obtenerEstadisticasHoy = async () => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(total) as monto_total,
        SUM(CASE WHEN sincronizado = 0 THEN 1 ELSE 0 END) as pendientes
      FROM cotizaciones 
      WHERE DATE(fecha) = ?
    `, [hoy]);

    return stats || { total: 0, monto_total: 0, pendientes: 0 };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return { total: 0, monto_total: 0, pendientes: 0 };
  }
};

export const actualizarCotizacion = async (idLocal, cotizacion) => {
  try {
    // Actualizar cotización principal
    await db.runAsync(
      `UPDATE cotizaciones 
       SET cliente_id = ?,
           cliente_nombre = ?,
           cliente_telefono = ?,
           cliente_municipio = ?,
           tipo = ?,
           subtotal = ?,
           total = ?,
           saldo = ?,
           observaciones = ?,
           sincronizado = 0
       WHERE id_local = ?`,
      [
        cotizacion.cliente_id,
        cotizacion.cliente_nombre,
        cotizacion.cliente_telefono,
        cotizacion.cliente_municipio,
        cotizacion.tipo,
        cotizacion.subtotal,
        cotizacion.total,
        cotizacion.tipo === 'credito' ? cotizacion.total : 0,
        cotizacion.observaciones || '',
        idLocal
      ]
    );

    // Eliminar detalles anteriores
    await db.runAsync(
      `DELETE FROM cotizacion_detalles WHERE cotizacion_id_local = ?`,
      [idLocal]
    );

    // Insertar nuevos detalles
    for (const producto of cotizacion.productos) {
      await db.runAsync(
        `INSERT INTO cotizacion_detalles 
         (cotizacion_id_local, producto_id, producto_nombre, producto_referencia, 
          cantidad, precio_venta, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idLocal,
          producto.producto_id,
          producto.nombre,
          producto.referencia,
          producto.cantidad,
          producto.precio_venta,
          producto.cantidad * producto.precio_venta
        ]
      );
    }

    console.log(`✅ Cotización ${idLocal} actualizada`);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando cotización:', error);
    throw error;
  }
};

/**
 * Elimina una cotización
 */
export const eliminarCotizacion = async (idLocal) => {
  try {
    // Los detalles se eliminan automáticamente por el ON DELETE CASCADE
    await db.runAsync(
      `DELETE FROM cotizaciones WHERE id_local = ?`,
      [idLocal]
    );
    console.log(`✅ Cotización ${idLocal} eliminada`);
    return true;
  } catch (error) {
    console.error('❌ Error eliminando cotización:', error);
    throw error;
  }
};

// ==================== SINCRONIZACIÓN BIDIRECCIONAL ====================

/**
 * Reconcilia cotizaciones del servidor con las locales
 */
export const reconciliarCotizaciones = async (cotizacionesServidor) => {
  try {
    console.log(`🔄 Iniciando reconciliación de ${cotizacionesServidor.length} cotizaciones...`);

    let insertadas = 0;
    let actualizadas = 0;
    let omitidas = 0;

    for (const cotServidor of cotizacionesServidor) {
      // Buscar si existe localmente (por numero_cotizacion o id_servidor)
      const cotLocal = await db.getFirstAsync(
        `SELECT * FROM cotizaciones 
         WHERE numero_cotizacion = ? OR id_servidor = ?`,
        [cotServidor.numero_cotizacion, cotServidor.id_servidor]
      );

      if (cotLocal) {
        // Ya existe localmente
        
        if (cotLocal.sincronizado === 1) {
          // Está sincronizada → ACTUALIZAR con datos del servidor (el servidor es la verdad)
          await actualizarDesdeSincronizacion(cotLocal.id_local, cotServidor);
          actualizadas++;
          console.log(`✏️ Actualizada: ${cotServidor.numero_cotizacion}`);
        } else {
          // NO está sincronizada → OMITIR (tiene cambios locales pendientes)
          omitidas++;
          console.log(`⏭️ Omitida (pendiente local): ${cotServidor.numero_cotizacion}`);
        }
      } else {
        // NO existe localmente → INSERTAR como nueva
        await insertarDesdeSincronizacion(cotServidor);
        insertadas++;
        console.log(`➕ Insertada: ${cotServidor.numero_cotizacion}`);
      }
    }

    // Detectar cotizaciones eliminadas en el servidor
    const eliminadas = await detectarEliminadas(cotizacionesServidor);

    console.log(`✅ Reconciliación completa:`, {
      insertadas,
      actualizadas,
      omitidas,
      eliminadas
    });

    return {
      insertadas,
      actualizadas,
      omitidas,
      eliminadas
    };
  } catch (error) {
    console.error('❌ Error en reconciliación:', error);
    throw error;
  }
};

/**
 * Actualiza una cotización local con datos del servidor
 */
const actualizarDesdeSincronizacion = async (idLocal, cotServidor) => {
  try {
    // Actualizar cotización principal
    await db.runAsync(
      `UPDATE cotizaciones 
       SET id_servidor = ?,
           fecha = ?,
           cliente_id = ?,
           cliente_nombre = ?,
           cliente_telefono = ?,
           cliente_municipio = ?,
           tipo = ?,
           subtotal = ?,
           total = ?,
           saldo = ?,
           observaciones = ?,
           sincronizado = 1,
           fecha_sincronizacion = datetime('now')
       WHERE id_local = ?`,
      [
        cotServidor.id_servidor,
        cotServidor.fecha,
        cotServidor.cliente_id,
        cotServidor.cliente_nombre || '',
        cotServidor.cliente_telefono || '',
        cotServidor.cliente_municipio || '',
        cotServidor.tipo,
        cotServidor.subtotal,
        cotServidor.total,
        cotServidor.saldo || 0,
        cotServidor.observaciones || '',
        idLocal
      ]
    );

    // Eliminar detalles anteriores
    await db.runAsync(
      `DELETE FROM cotizacion_detalles WHERE cotizacion_id_local = ?`,
      [idLocal]
    );

    // Insertar nuevos detalles
    for (const prod of cotServidor.productos) {
      await db.runAsync(
        `INSERT INTO cotizacion_detalles 
         (cotizacion_id_local, producto_id, producto_nombre, producto_referencia, 
          cantidad, precio_venta, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idLocal,
          prod.producto_id,
          prod.producto_nombre || '',
          prod.producto_referencia || '',
          prod.cantidad,
          prod.precio_venta,
          prod.subtotal
        ]
      );
    }
  } catch (error) {
    console.error('❌ Error actualizando desde sincronización:', error);
    throw error;
  }
};

/**
 * Inserta una cotización del servidor como nueva local
 */
const insertarDesdeSincronizacion = async (cotServidor) => {
  try {
    // Insertar cotización principal
    const result = await db.runAsync(
      `INSERT INTO cotizaciones 
       (id_servidor, numero_cotizacion, fecha, cliente_id, cliente_nombre, 
        cliente_telefono, cliente_municipio, tipo, subtotal, total, saldo, 
        observaciones, sincronizado, fecha_sincronizacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [
        cotServidor.id_servidor,
        cotServidor.numero_cotizacion,
        cotServidor.fecha,
        cotServidor.cliente_id,
        cotServidor.cliente_nombre || '',
        cotServidor.cliente_telefono || '',
        cotServidor.cliente_municipio || '',
        cotServidor.tipo,
        cotServidor.subtotal,
        cotServidor.total,
        cotServidor.saldo || 0,
        cotServidor.observaciones || ''
      ]
    );

    const idLocal = result.lastInsertRowId;

    // Insertar detalles
    for (const prod of cotServidor.productos) {
      await db.runAsync(
        `INSERT INTO cotizacion_detalles 
         (cotizacion_id_local, producto_id, producto_nombre, producto_referencia, 
          cantidad, precio_venta, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          idLocal,
          prod.producto_id,
          prod.producto_nombre || '',
          prod.producto_referencia || '',
          prod.cantidad,
          prod.precio_venta,
          prod.subtotal
        ]
      );
    }
  } catch (error) {
    console.error('❌ Error insertando desde sincronización:', error);
    throw error;
  }
};

/**
 * Detecta y elimina cotizaciones que fueron eliminadas en el servidor
 */
const detectarEliminadas = async (cotizacionesServidor) => {
  try {
    // Obtener todas las cotizaciones locales sincronizadas
    const cotizacionesLocales = await db.getAllAsync(
      `SELECT id_local, id_servidor, numero_cotizacion 
       FROM cotizaciones 
       WHERE sincronizado = 1 AND id_servidor IS NOT NULL`
    );

    // Crear un Set con los IDs del servidor
    const idsServidor = new Set(
      cotizacionesServidor.map(c => c.id_servidor)
    );

    let eliminadas = 0;

    // Verificar cada cotización local
    for (const cotLocal of cotizacionesLocales) {
      // Si no está en el servidor → fue eliminada
      if (!idsServidor.has(cotLocal.id_servidor)) {
        await db.runAsync(
          `DELETE FROM cotizaciones WHERE id_local = ?`,
          [cotLocal.id_local]
        );
        eliminadas++;
        console.log(`🗑️ Eliminada (borrada en servidor): ${cotLocal.numero_cotizacion}`);
      }
    }

    return eliminadas;
  } catch (error) {
    console.error('❌ Error detectando eliminadas:', error);
    return 0;
  }
};

/**
 * Obtiene estadísticas de sincronización
 */
export const obtenerEstadisticasSincronizacion = async () => {
  try {
    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sincronizado = 1 THEN 1 ELSE 0 END) as sincronizadas,
        SUM(CASE WHEN sincronizado = 0 THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN id_servidor IS NULL THEN 1 ELSE 0 END) as solo_locales,
        SUM(CASE WHEN id_servidor IS NOT NULL THEN 1 ELSE 0 END) as del_servidor
      FROM cotizaciones
    `);

    return stats || { 
      total: 0, 
      sincronizadas: 0, 
      pendientes: 0,
      solo_locales: 0,
      del_servidor: 0
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return { 
      total: 0, 
      sincronizadas: 0, 
      pendientes: 0,
      solo_locales: 0,
      del_servidor: 0
    };
  }
};

export default db;