// app/(tabs)/configuracion.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout, obtenerAPIUrl, configurarAPIUrl, testConexion } from '@/src/config/api';
import { obtenerCotizaciones } from '@/src/database/db';

export default function ConfiguracionScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState({ nombre: '', username: '', rol: '' });
  const [apiUrl, setApiUrl] = useState('');
  const [totalCotizaciones, setTotalCotizaciones] = useState(0);
  const [editandoUrl, setEditandoUrl] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    // Usuario
    try {
      const usuarioStr = await AsyncStorage.getItem('usuario');
      if (usuarioStr) {
        setUsuario(JSON.parse(usuarioStr));
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }

    // URL API
    const url = obtenerAPIUrl() ?? '';
    setApiUrl(url);

    // Total cotizaciones
    const cots = await obtenerCotizaciones();
    setTotalCotizaciones(cots.length);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const guardarApiUrl = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Error', 'La URL no puede estar vacía');
      return;
    }

    await configurarAPIUrl(apiUrl.trim());
    setEditandoUrl(false);

    // Test de conexión
    const resultado = await testConexion();
    if (resultado.success) {
      Alert.alert('Éxito', 'Conexión exitosa con el servidor');
    } else {
      Alert.alert('Advertencia', 'No se pudo conectar al servidor. Verifica la URL.');
    }
  };

  const testearConexion = async () => {
    Alert.alert('Probando Conexión', 'Verificando conexión con el servidor...');
    const resultado = await testConexion();

    if (resultado.success) {
      Alert.alert('✅ Éxito', 'Conexión exitosa con el servidor');
    } else {
      Alert.alert('❌ Error', resultado.error || 'No se pudo conectar al servidor');
    }
  };

  const limpiarDatos = () => {
    Alert.alert(
      'Limpiar Datos',
      '⚠️ Esto eliminará todas las cotizaciones locales. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Aquí puedes implementar la lógica para limpiar la BD
            Alert.alert('Info', 'Funcionalidad en desarrollo');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Información del usuario */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Usuario</Text>
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{usuario.nombre || 'Usuario'}</Text>
            <Text style={styles.userDetail}>@{usuario.username || 'N/A'}</Text>
            <Text style={styles.userDetail}>Rol: {usuario.rol || 'Vendedor'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Configuración del servidor */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Servidor API</Text>

        {editandoUrl ? (
          <View>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.1.100:3000/api"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setApiUrl(obtenerAPIUrl() ?? '');
                  setEditandoUrl(false);
                }}>
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={guardarApiUrl}>
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.urlCard}>
              <Text style={styles.urlLabel}>URL:</Text>
              <Text style={styles.urlValue} numberOfLines={2}>
                {apiUrl}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setEditandoUrl(true)}>
                <Text style={styles.buttonSecondaryText}>Editar URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={testearConexion}>
                <Text style={styles.buttonText}>Probar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Estadísticas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total de Cotizaciones:</Text>
          <Text style={styles.statValue}>{totalCotizaciones}</Text>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Acciones</Text>

        <TouchableOpacity style={styles.actionButton} onPress={testearConexion}>
          <Text style={styles.actionIcon}>🔌</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Probar Conexión</Text>
            <Text style={styles.actionSubtitle}>Verificar conexión con el servidor</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/sincronizar')}>
          <Text style={styles.actionIcon}>🔄</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Sincronizar</Text>
            <Text style={styles.actionSubtitle}>Enviar y recibir datos</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={limpiarDatos}>
          <Text style={styles.actionIcon}>🗑️</Text>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, styles.textDanger]}>Limpiar Datos</Text>
            <Text style={styles.actionSubtitle}>Eliminar cotizaciones locales</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Información de la app */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Cotizaciones Móvil v1.0.0</Text>
        <Text style={styles.footerText}>Caquetá, Colombia 🇨🇴</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  userCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
  },
  userInfo: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  urlCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  urlLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  urlValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 15,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#004080',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonSecondaryText: {
    color: '#666',
    fontWeight: 'bold',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 15,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004080',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonDanger: {
    backgroundColor: '#FFEBEE',
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  textDanger: {
    color: '#d32f2f',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 5,
  },
});