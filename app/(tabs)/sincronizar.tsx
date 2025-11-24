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
} from '@/src/database/db';
import {
  sincronizarCotizaciones,
  descargarDatosIniciales,
  verificarConexion,
} from '@/src/config/api';

export default function SincronizacionScreen() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [conexion, setConexion] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const cots = await obtenerCotizacionesPendientes();
    setPendientes(cots);

    const tieneConexion = await verificarConexion();
    setConexion(!!tieneConexion);
  };

  const sincronizar = async () => {
    if (pendientes.length === 0) {
      Alert.alert('Info', 'No hay cotizaciones pendientes');
      return;
    }

    if (!conexion) {
      Alert.alert('Sin Conexión', 'No hay conexión a internet. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    setLoading(true);
    setProgreso('Enviando cotizaciones...');

    try {
      const resultado = await sincronizarCotizaciones(pendientes);

      if (!resultado.success) {
        throw new Error(resultado.error);
      }

      const data = resultado.data;
      let exitosas = 0;
      let fallidas = 0;
      const errores: string[] = [];

      // Procesar resultados
      if (data.detalles) {
        for (const r of data.detalles) {
          if (r.exito) {
            await marcarComoSincronizada(r.id_local, r.id_servidor);
            exitosas++;
          } else {
            fallidas++;
            errores.push(`${r.numero_cotizacion || 'Cotización'}: ${r.error}`);
          }
        }
      }

      // Mostrar resultado
      if (fallidas === 0) {
        Alert.alert(
          '✅ Sincronización Completa',
          `Se sincronizaron ${exitosas} cotización${exitosas !== 1 ? 'es' : ''} exitosamente.`,
          [{ text: 'OK', onPress: () => cargarDatos() }]
        );
      } else {
        Alert.alert(
          '⚠️ Sincronización Parcial',
          `✅ Exitosas: ${exitosas}\n❌ Fallidas: ${fallidas}\n\nErrores:\n${errores.join('\n')}`,
          [{ text: 'OK', onPress: () => cargarDatos() }]
        );
      }
    } catch (error: any) {
      console.error('Error sincronizando:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo sincronizar. Verifica tu conexión e intenta de nuevo.'
      );
    } finally {
      setLoading(false);
      setProgreso('');
    }
  };

  const descargarDatos = async () => {
    if (!conexion) {
      Alert.alert('Sin Conexión', 'No hay conexión a internet. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    setLoading(true);
    setProgreso('Descargando datos del servidor...');

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

      {/* Enviar cotizaciones */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📤 Enviar Cotizaciones</Text>
        <Text style={styles.cardSubtitle}>
          {pendientes.length} cotización{pendientes.length !== 1 ? 'es' : ''} pendiente
          {pendientes.length !== 1 ? 's' : ''}
        </Text>

        {pendientes.length > 0 && (
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
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, !conexion && styles.buttonDisabled]}
          onPress={sincronizar}
          disabled={loading || pendientes.length === 0 || !conexion}>
          <Text style={styles.buttonText}>
            {loading && progreso.includes('Enviando') ? 'Enviando...' : 'Sincronizar Ahora'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Descargar datos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📥 Actualizar Datos</Text>
        <Text style={styles.cardSubtitle}>Descargar productos, clientes y municipios actualizados del servidor</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Descarga los datos más recientes para trabajar offline
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, !conexion && styles.buttonDisabled]}
          onPress={descargarDatos}
          disabled={loading || !conexion}>
          <Text style={styles.buttonText}>
            {loading && progreso.includes('Descargando') ? 'Descargando...' : 'Descargar Datos'}
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
  listContainer: {
    marginBottom: 15,
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