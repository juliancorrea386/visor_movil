// app/(app)/index.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  obtenerEstadisticasHoy,
  obtenerCotizacionesPendientes,
} from '@/src/database/db';
import { verificarConexion, logout } from '@/src/config/api';

export default function HomeScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState({ nombre: 'Usuario', rol: 'vendedor' });
  const [stats, setStats] = useState({ total: 0, monto_total: 0, pendientes: 0 });
  const [pendientes, setPendientes] = useState(0);
  const [conexion, setConexion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    // Cargar usuario
    try {
      const usuarioStr = await AsyncStorage.getItem('usuario');
      if (usuarioStr) {
        setUsuario(JSON.parse(usuarioStr));
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }

    // Cargar estadísticas
    const estadisticas = await obtenerEstadisticasHoy();
    setStats(estadisticas);

    // Cargar pendientes
    const cotsPendientes = await obtenerCotizacionesPendientes();
    setPendientes(cotsPendientes.length);

    // Verificar conexión
    const tieneConexion = await verificarConexion();
    setConexion(!!tieneConexion);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header con info del usuario */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {usuario.nombre || 'Usuario'} 👋</Text>
          <Text style={styles.subGreeting}>
            {conexion ? '🟢 En línea' : '🔴 Sin conexión'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjetas de estadísticas */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardBlue]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Cotizaciones Hoy</Text>
        </View>

        <View style={[styles.statCard, styles.statCardGreen]}>
          <Text style={styles.statValue}>
            ${(stats.monto_total || 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total del Día</Text>
        </View>
      </View>

      {/* Alerta de pendientes */}
      {pendientes > 0 && (
        <TouchableOpacity
          style={styles.alertCard}
          onPress={() => router.push('/(app)/sincronizar')}>
          <View style={styles.alertContent}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>
                {pendientes} cotización{pendientes > 1 ? 'es' : ''} pendiente
                {pendientes > 1 ? 's' : ''}
              </Text>
              <Text style={styles.alertSubtitle}>Toca para sincronizar</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Acciones rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/nueva-cotizacion')}>
          <Text style={styles.actionIcon}>➕</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Nueva Cotización</Text>
            <Text style={styles.actionSubtitle}>Crear una nueva cotización</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/lista')}>
          <Text style={styles.actionIcon}>📋</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Ver Cotizaciones</Text>
            <Text style={styles.actionSubtitle}>Historial completo</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/sincronizar')}>
          <Text style={styles.actionIcon}>🔄</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Sincronizar</Text>
            <Text style={styles.actionSubtitle}>Enviar y recibir datos</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#004080',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardBlue: {
    backgroundColor: '#2196F3',
  },
  statCardGreen: {
    backgroundColor: '#4CAF50',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  alertCard: {
    backgroundColor: '#FFF3CD',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  alertSubtitle: {
    fontSize: 14,
    color: '#856404',
    marginTop: 2,
  },
  actionsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});