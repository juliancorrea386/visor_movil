// app/(tabs)/impresora.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buscarImpresoras,
  conectarImpresora,
  desconectarImpresora,
  imprimirPrueba,
} from '@/src/utils/printer';

const IMPRESORA_KEY = 'impresora_guardada';

export default function ImpresoraScreen() {
  const [impresoras, setImpresoras] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [impresoraConectada, setImpresoraConectada] = useState<any>(null);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    cargarImpresoraGuardada();
  }, []);

  const cargarImpresoraGuardada = async () => {
    try {
      const guardada = await AsyncStorage.getItem(IMPRESORA_KEY);
      if (guardada) {
        setImpresoraConectada(JSON.parse(guardada));
      }
    } catch (error) {
      console.error('Error cargando impresora guardada:', error);
    }
  };

  const solicitarPermisos = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Error solicitando permisos:', err);
        return false;
      }
    }
    return true;
  };

  const buscarDisponibles = async () => {
    const tienePermisos = await solicitarPermisos();
    
    if (!tienePermisos) {
      Alert.alert(
        'Permisos Requeridos',
        'Se necesitan permisos de Bluetooth y ubicación para buscar impresoras.'
      );
      return;
    }

    setBuscando(true);
    try {
      const dispositivos = await buscarImpresoras();
      setImpresoras(dispositivos);
      
      if (dispositivos.length === 0) {
        Alert.alert(
          'Sin Dispositivos',
          'No se encontraron impresoras Bluetooth. Asegúrate de que tu impresora esté encendida y visible.'
        );
      }
    } catch (error: any) {
      console.error('Error buscando impresoras:', error);
      Alert.alert('Error', 'No se pudieron buscar impresoras: ' + error.message);
    } finally {
      setBuscando(false);
    }
  };

  const conectar = async (impresora: any) => {
    setConectando(true);
    try {
      const resultado = await conectarImpresora(impresora.address);
      
      if (resultado.success) {
        setImpresoraConectada(impresora);
        await AsyncStorage.setItem(IMPRESORA_KEY, JSON.stringify(impresora));
        Alert.alert('✅ Conectado', `Conectado a ${impresora.name}`);
      } else {
        Alert.alert('Error', 'No se pudo conectar a la impresora');
      }
    } catch (error: any) {
      console.error('Error conectando:', error);
      Alert.alert('Error', 'Error al conectar: ' + error.message);
    } finally {
      setConectando(false);
    }
  };

  const desconectar = async () => {
    try {
      await desconectarImpresora();
      setImpresoraConectada(null);
      await AsyncStorage.removeItem(IMPRESORA_KEY);
      Alert.alert('Desconectado', 'Impresora desconectada');
    } catch (error) {
      console.error('Error desconectando:', error);
    }
  };

  const pruebaImpresion = async () => {
    if (!impresoraConectada) {
      Alert.alert('Error', 'Debes conectar una impresora primero');
      return;
    }

    setImprimiendo(true);
    try {
      const resultado = await imprimirPrueba();
      
      if (resultado.success) {
        Alert.alert('✅ Éxito', 'Página de prueba impresa correctamente');
      } else {
        Alert.alert('Error', 'No se pudo imprimir: ' + resultado.error);
      }
    } catch (error: any) {
      console.error('Error imprimiendo prueba:', error);
      Alert.alert('Error', 'Error al imprimir: ' + error.message);
    } finally {
      setImprimiendo(false);
    }
  };

  const renderImpresora = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.impresoraItem}
      onPress={() => conectar(item)}
      disabled={conectando}>
      <View style={styles.impresoraInfo}>
        <Text style={styles.impresoraNombre}>{item.name || 'Dispositivo sin nombre'}</Text>
        <Text style={styles.impresoraAddress}>{item.address}</Text>
      </View>
      {conectando && <ActivityIndicator size="small" color="#004080" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Estado de conexión */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖨️ Estado de Impresora</Text>
        
        {impresoraConectada ? (
          <View style={styles.conectadoCard}>
            <View style={styles.conectadoInfo}>
              <Text style={styles.conectadoIcon}>✅</Text>
              <View style={styles.conectadoTexto}>
                <Text style={styles.conectadoNombre}>{impresoraConectada.name}</Text>
                <Text style={styles.conectadoAddress}>{impresoraConectada.address}</Text>
              </View>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={pruebaImpresion}
                disabled={imprimiendo}>
                {imprimiendo ? (
                  <ActivityIndicator color="#004080" size="small" />
                ) : (
                  <Text style={styles.buttonSecondaryText}>Imprimir Prueba</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={desconectar}>
                <Text style={styles.buttonDangerText}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.desconectadoCard}>
            <Text style={styles.desconectadoIcon}>⚠️</Text>
            <Text style={styles.desconectadoTexto}>No hay impresora conectada</Text>
          </View>
        )}
      </View>

      {/* Buscar impresoras */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Buscar Impresoras</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={buscarDisponibles}
          disabled={buscando}>
          {buscando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🔍 Buscar Dispositivos Bluetooth</Text>
          )}
        </TouchableOpacity>

        {impresoras.length > 0 && (
          <View style={styles.listaContainer}>
            <Text style={styles.listaTitle}>
              {impresoras.length} dispositivo{impresoras.length !== 1 ? 's' : ''} encontrado
              {impresoras.length !== 1 ? 's' : ''}:
            </Text>
            
            <FlatList
              data={impresoras}
              keyExtractor={(item, index) => item.address || index.toString()}
              renderItem={renderImpresora}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>

      {/* Instrucciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Instrucciones</Text>
        
        <View style={styles.instruccionesCard}>
          <Text style={styles.instruccionPaso}>1. Enciende tu impresora térmica Bluetooth</Text>
          <Text style={styles.instruccionPaso}>
            2. Asegúrate de que tu impresora esté visible para otros dispositivos
          </Text>
          <Text style={styles.instruccionPaso}>3. Toca "Buscar Dispositivos Bluetooth"</Text>
          <Text style={styles.instruccionPaso}>
            4. Selecciona tu impresora de la lista
          </Text>
          <Text style={styles.instruccionPaso}>
            5. Una vez conectada, podrás imprimir cotizaciones desde la lista
          </Text>
        </View>

        <View style={styles.notaCard}>
          <Text style={styles.notaIcon}>💡</Text>
          <Text style={styles.notaTexto}>
            Esta app está configurada para impresoras térmicas de 80mm de ancho. Si tu
            impresora tiene otro ancho, es posible que el formato no se vea correctamente.
          </Text>
        </View>
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
  conectadoCard: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  conectadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  conectadoIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  conectadoTexto: {
    flex: 1,
  },
  conectadoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  conectadoAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  desconectadoCard: {
    backgroundColor: '#FFF3CD',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  desconectadoIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  desconectadoTexto: {
    fontSize: 16,
    color: '#856404',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#004080',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#004080',
  },
  buttonDanger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  buttonSecondaryText: {
    color: '#004080',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonDangerText: {
    color: '#f44336',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listaContainer: {
    marginTop: 15,
  },
  listaTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  impresoraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  impresoraInfo: {
    flex: 1,
  },
  impresoraNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  impresoraAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  instruccionesCard: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
  },
  instruccionPaso: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 8,
    lineHeight: 20,
  },
  notaCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  notaIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  notaTexto: {
    flex: 1,
    fontSize: 13,
    color: '#F57F17',
    lineHeight: 18,
  },
});