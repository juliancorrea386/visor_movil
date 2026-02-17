// app/(tabs)/sincronizar.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  obtenerCotizacionesPendientes,
  marcarComoSincronizada,
  guardarProductosCache,
  guardarClientesCache,
  guardarMunicipiosCache,
  reconciliarCotizaciones,
  obtenerEstadisticasSincronizacion,
} from '@/src/database/db';
import {
  sincronizarCotizaciones,
  descargarDatosIniciales,
  descargarCotizaciones,
  verificarConexion,
} from '@/src/config/api';

export default function SincronizacionScreen() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    sincronizadas: 0,
    pendientes: 0,
    solo_locales: 0,
    del_servidor: 0,
  });
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [conexion, setConexion] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const cots = await obtenerCotizacionesPendientes();
    setPendientes(cots);

    const stats = await obtenerEstadisticasSincronizacion();
    setEstadisticas(stats);

    const tieneConexion = await verificarConexion();
    setConexion(!!tieneConexion);
  };

  const sincronizarCompleto = async () => {
    if (!conexion) {
      Alert.alert('Sin Conexión', 'No hay conexión a internet. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    Alert.alert(
      '🔄 Sincronización Completa',
      '¿Deseas sincronizar todas las cotizaciones?\n\n1️⃣ Enviar pendientes al servidor\n2️⃣ Descargar del servidor\n3️⃣ Reconciliar cambios',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sincronizar', onPress: ejecutarSincronizacionCompleta }
      ]
    );
  };

  const ejecutarSincronizacionCompleta = async () => {
    setLoading(true);
    
    try {
      // PASO 1: Enviar cotizaciones pendientes
      if (pendientes.length > 0) {
        setProgreso('📤 Enviando cotizaciones pendientes...');
        await enviarPendientes();
      }

      // PASO 2: Descargar cotizaciones del servidor
      setProgreso('📥 Descargando cotizaciones del servidor...');
      const resultadoDescarga = await descargarCotizaciones({
        // Puedes agregar filtros aquí si quieres
        // desde: '2024-01-01',
        // hasta: new Date().toISOString().split('T')[0]
      });

      if (!resultadoDescarga.success) {
        throw new Error(resultadoDescarga.error);
      }

      // PASO 3: Reconciliar con la base de datos local
      setProgreso('🔄 Reconciliando cotizaciones...');
      const resultadoReconciliacion = await reconciliarCotizaciones(
        resultadoDescarga.data
      );

      // Recargar datos
      await cargarDatos();

      // Mostrar resumen
      Alert.alert(
        '✅ Sincronización Completa',
        `
🔼 Enviadas: ${pendientes.length}
🔽 Descargadas: ${resultadoDescarga.data.length}

📊 Resultado:
- Insertadas: ${resultadoReconciliacion.insertadas}
- Actualizadas: ${resultadoReconciliacion.actualizadas}
- Omitidas: ${resultadoReconciliacion.omitidas}
- Eliminadas: ${resultadoReconciliacion.eliminadas}

Total local: ${estadisticas.total + resultadoReconciliacion.insertadas - resultadoReconciliacion.eliminadas}
        `.trim()
      );
    } catch (error: any) {
      console.error('Error en sincronización completa:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo completar la sincronización'
      );
    } finally {
      setLoading(false);
      setProgreso('');
    }
  };

  const enviarPendientes = async () => {
    if (pendientes.length === 0) {
      return;
    }

    try {
      const resultado = await sincronizarCotizaciones(pendientes);

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

      const data = resultado.data;
      
      // Marcar como sincronizadas las exitosas
      if (data.detalles) {
        for (const r of data.detalles) {
          if (r.exito) {
            await marcarComoSincronizada(r.id_local, r.id_servidor);
          }
        }
      }

      console.log(`✅ ${data.exitosas} cotizaciones enviadas exitosamente`);
    } catch (error: any) {
      console.error('Error enviando pendientes:', error);
      throw error;
    }
  };

  const descargarDatos = async () => {
    if (!conexion) {
      Alert.alert('Sin Conexión', 'No hay conexión a internet. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    setLoading(true);
    setProgreso('📥 Descargando productos, clientes y municipios...');

    try {
      const resultado = await descargarDatosIniciales();

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

      const datos = resultado.data;

      if (datos.productos) {
        await guardarProductosCache(datos.productos);
      }

      if (datos.clientes) {
        await guardarClientesCache(datos.clientes);
      }

      if (datos.municipios) {
        await guardarMunicipiosCache(datos.municipios);
      }

      Alert.alert(
        '✅ Éxito',
        `Datos actualizados:\n\n📦 ${datos.productos?.length || 0} productos\n👥 ${
          datos.clientes?.length || 0
        } clientes\n📍 ${datos.municipios?.length || 0} municipios`
      );
    } catch (error: any) {
      console.error('Error descargando datos:', error);
      Alert.alert('Error', error.message || 'No se pudieron descargar los datos');
    } finally {
      setLoading(false);
      setProgreso('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Estado de conexión */}
      <View style={[styles.card, conexion ? styles.cardOnline : styles.cardOffline]}>
        <Text style={styles.connectionIcon}>{conexion ? '🟢' : '🔴'}</Text>
        <Text style={styles.connectionText}>
          {conexion ? 'Conectado a Internet' : 'Sin Conexión'}
        </Text>
        <TouchableOpacity onPress={cargarDatos} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄 Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Estado de Cotizaciones</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{estadisticas.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statSuccess]}>{estadisticas.sincronizadas}</Text>
            <Text style={styles.statLabel}>Sincronizadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statWarning]}>{estadisticas.pendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statInfo]}>{estadisticas.del_servidor}</Text>
            <Text style={styles.statLabel}>Del Servidor</Text>
          </View>
        </View>
      </View>

      {/* Sincronización completa */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔄 Sincronización Completa</Text>
        <Text style={styles.cardSubtitle}>
          Envía cotizaciones pendientes y descarga las del servidor
        </Text>

        {pendientes.length > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>
              Tienes {pendientes.length} cotización{pendientes.length !== 1 ? 'es' : ''} pendiente
              {pendientes.length !== 1 ? 's' : ''} de enviar
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, !conexion && styles.buttonDisabled]}
          onPress={sincronizarCompleto}
          disabled={loading || !conexion}>
          <Text style={styles.buttonText}>
            {loading && progreso.includes('Sincronizando') ? 'Sincronizando...' : '🔄 Sincronizar Todo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cotizaciones pendientes */}
      {pendientes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Cotizaciones Pendientes</Text>
          <Text style={styles.cardSubtitle}>
            {pendientes.length} cotización{pendientes.length !== 1 ? 'es' : ''} sin sincronizar
          </Text>

          <View style={styles.listContainer}>
            {pendientes.slice(0, 5).map((c) => (
              <View key={c.id_local} style={styles.pendienteItem}>
                <View style={styles.pendienteInfo}>
                  <Text style={styles.pendienteNumero}>{c.numero_cotizacion}</Text>
                  <Text style={styles.pendienteCliente}>{c.cliente_nombre}</Text>
                  {c.id_servidor && (
                    <Text style={styles.pendienteEditado}>✏️ Editada</Text>
                  )}
                </View>
                <Text style={styles.pendienteMonto}>${c.total.toLocaleString()}</Text>
              </View>
            ))}
            {pendientes.length > 5 && (
              <Text style={styles.masItems}>+{pendientes.length - 5} más...</Text>
            )}
          </View>
        </View>
      )}

      {/* Descargar datos maestros */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📥 Actualizar Datos Maestros</Text>
        <Text style={styles.cardSubtitle}>
          Descargar productos, clientes y municipios actualizados
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Actualiza los catálogos para trabajar con la información más reciente
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, !conexion && styles.buttonDisabled]}
          onPress={descargarDatos}
          disabled={loading || !conexion}>
          <Text style={styles.buttonText}>
            {loading && progreso.includes('productos') ? 'Descargando...' : '📥 Descargar Datos'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Indicador de progreso */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004080" />
          <Text style={styles.loadingText}>{progreso}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardOnline: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardOffline: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  connectionIcon: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 5,
  },
  connectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  refreshButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#666',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statSuccess: {
    color: '#4CAF50',
  },
  statWarning: {
    color: '#ff9800',
  },
  statInfo: {
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
  },
  listContainer: {
    marginTop: 10,
  },
  pendienteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pendienteInfo: {
    flex: 1,
  },
  pendienteNumero: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#004080',
  },
  pendienteCliente: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  pendienteEditado: {
    fontSize: 11,
    color: '#ff9800',
    marginTop: 2,
  },
  pendienteMonto: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  masItems: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#004080',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 15,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});