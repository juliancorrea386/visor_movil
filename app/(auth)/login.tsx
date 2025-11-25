// app/(auth)/login.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login, obtenerAPIUrl, configurarAPIUrl, testConexion } from '@/src/config/api';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      const resultado = await login(username.trim(), password.trim());

      if (resultado.success) {
        console.log('✅ Login exitoso');
        // Pequeño delay para asegurar que AsyncStorage guarde todo
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        console.log('❌ Login fallido:', resultado.error);
        Alert.alert(
          'Error de Autenticación', 
          resultado.error || 'Credenciales incorrectas. Verifica tu usuario y contraseña.'
        );
      }
    } catch (error) {
      console.error('❌ Error crítico en login:', error);
      Alert.alert(
        'Error de Conexión', 
        'No se pudo conectar con el servidor. Verifica tu conexión a internet y la URL del servidor en Configuración.'
      );
    } finally {
      setLoading(false);
    }
  };

  const abrirConfiguracion = async () => {
    const url = obtenerAPIUrl() || '';
    setApiUrl(url);
    setModalConfig(true);
  };

  const guardarConfiguracion = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Error', 'La URL no puede estar vacía');
      return;
    }

    setLoading(true);
    await configurarAPIUrl(apiUrl.trim());
    
    // Probar conexión
    const resultado = await testConexion();
    setLoading(false);
    
    if (resultado.success) {
      Alert.alert('✅ Éxito', 'Conexión exitosa con el servidor');
      setModalConfig(false);
    } else {
      Alert.alert('⚠️ Advertencia', resultado.error || 'No se pudo conectar. Verifica la URL.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>📋</Text>
          </View>
          <Text style={styles.title}>Cotizaciones Móvil</Text>
          <Text style={styles.subtitle}>Sistema de Gestión</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu usuario"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              importantForAutofill="no"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          {/* Botón de configuración */}
          <TouchableOpacity
            style={styles.configButton}
            onPress={abrirConfiguracion}
            disabled={loading}>
            <Text style={styles.configButtonText}>⚙️ Configurar Servidor</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Cotizaciones Móvil v1.0.0</Text>
          <Text style={styles.footerText}>Caquetá, Colombia 🇨🇴</Text>
        </View>
      </View>

      {/* Modal de configuración */}
      <Modal
        visible={modalConfig}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalConfig(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Servidor API</Text>
            
            <Text style={styles.modalLabel}>URL del Servidor:</Text>
            <TextInput
              style={styles.modalInput}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.1.100:4000/api"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.modalHint}>
              💡 Ejemplo: http://IP:PUERTO/api
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalConfig(false)}
                disabled={loading}>
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={guardarConfiguracion}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar y Probar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#004080',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#004080',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButton: {
    backgroundColor: '#004080',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  configButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  configButtonText: {
    color: '#666',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#004080',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  modalHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtonSave: {
    backgroundColor: '#004080',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalButtonTextSave: {
    color: '#fff',
    fontWeight: 'bold',
  },
});