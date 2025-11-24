// app/(tabs)/clientes.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { obtenerClientesCache, obtenerMunicipiosCache } from '@/src/database/db';
import api from '@/src/config/api';

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string;
  municipio?: string;
  municipio_id?: number;
};

type Municipio = {
  id: number;
  nombre: string;
};

export default function ClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal nuevo cliente
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    id: '',
    nombre: '',
    telefono: '',
    municipio_id: 0,
  });
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [modalMunicipios, setModalMunicipios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarClientes();
    cargarMunicipios();
  }, []);

  useEffect(() => {
    filtrarClientes();
  }, [busqueda, clientes]);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      const clientesLocal = await obtenerClientesCache('');
      setClientes(clientesLocal as Cliente[]);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarMunicipios = async () => {
    try {
      const munis = await obtenerMunicipiosCache();
      setMunicipios(munis as Municipio[]);
    } catch (error) {
      console.error('Error cargando municipios:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Descargar clientes actualizados del servidor
      const response = await api.get('/clientes');
      const clientesServidor = response.data;
      
      // Guardar en cache local
      const { guardarClientesCache } = await import('@/src/database/db');
      await guardarClientesCache(clientesServidor);
      
      console.log(`✅ ${clientesServidor.length} clientes sincronizados desde servidor`);
      
      // Recargar lista
      await cargarClientes();
    } catch (error) {
      console.error('Error sincronizando clientes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filtrarClientes = () => {
    if (!busqueda.trim()) {
      setClientesFiltrados(clientes);
      return;
    }

    const filtrados = clientes.filter(
      (c) =>
        c.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
    setClientesFiltrados(filtrados);
  };

  const abrirModalNuevo = () => {
    setNuevoCliente({
      id: '',
      nombre: '',
      telefono: '',
      municipio_id: 0,
    });
    setModalNuevo(true);
  };

  const seleccionarMunicipio = (mun: Municipio) => {
    setNuevoCliente({ ...nuevoCliente, municipio_id: mun.id });
    setModalMunicipios(false);
  };

  const validarCliente = () => {
    if (!nuevoCliente.id.trim()) {
      Alert.alert('Error', 'La cédula es requerida');
      return false;
    }

    if (!nuevoCliente.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }

    if (nuevoCliente.municipio_id === 0) {
      Alert.alert('Error', 'Debes seleccionar un municipio');
      return false;
    }

    return true;
  };

  const guardarCliente = async () => {
    if (!validarCliente()) return;

    setGuardando(true);
    try {
      const response = await api.post('/clientes', {
        id: nuevoCliente.id.trim(),
        nombre: nuevoCliente.nombre.trim(),
        telefono: nuevoCliente.telefono.trim() || null,
        municipio: nuevoCliente.municipio_id, // El backend espera 'municipio' no 'municipio_id'
      });

      Alert.alert('✅ Éxito', 'Cliente creado correctamente');
      setModalNuevo(false);
      
      // Recargar lista desde servidor
      await onRefresh();
    } catch (error: any) {
      console.error('Error guardando cliente:', error);
      const mensaje = error.response?.data?.message || error.response?.data?.error || 'No se pudo guardar el cliente';
      Alert.alert('Error', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const verDetalleCliente = (cliente: Cliente) => {
    const municipioNombre = municipios.find((m) => m.id === cliente.municipio_id)?.nombre || cliente.municipio || 'N/A';
    
    Alert.alert(
      '👤 Cliente',
      `
Cédula: ${cliente.id}
Nombre: ${cliente.nombre}
Teléfono: ${cliente.telefono || 'N/A'}
Municipio: ${municipioNombre}
      `.trim()
    );
  };

  const renderCliente = ({ item }: { item: Cliente }) => (
    <TouchableOpacity
      style={styles.clienteCard}
      onPress={() => verDetalleCliente(item)}
      activeOpacity={0.7}>
      <View style={styles.clienteInfo}>
        <Text style={styles.clienteNombre}>{item.nombre}</Text>
        <Text style={styles.clienteCedula}>CC: {item.id}</Text>
        {item.telefono && (
          <Text style={styles.clienteTelefono}>📞 {item.telefono}</Text>
        )}
        {item.municipio && (
          <Text style={styles.clienteMunicipio}>📍 {item.municipio}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cédula o nombre..."
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.addButton} onPress={abrirModalNuevo}>
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Contador */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
          {busqueda ? ' encontrado' + (clientesFiltrados.length !== 1 ? 's' : '') : ''}
        </Text>
      </View>

      {/* Lista de clientes */}
      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004080" />
          <Text style={styles.loadingText}>Cargando clientes...</Text>
        </View>
      ) : clientesFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>
            {busqueda ? 'No se encontraron clientes' : 'No hay clientes'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {busqueda
              ? 'Intenta con otra búsqueda'
              : 'Crea tu primer cliente'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientesFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderCliente}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Modal Nuevo Cliente */}
      <Modal
        visible={modalNuevo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalNuevo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Cliente</Text>
              <TouchableOpacity onPress={() => setModalNuevo(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cédula *</Text>
              <TextInput
                style={styles.input}
                placeholder="Número de cédula"
                value={nuevoCliente.id}
                onChangeText={(val) =>
                  setNuevoCliente({ ...nuevoCliente, id: val })
                }
                keyboardType="numeric"
                maxLength={30}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del cliente"
                value={nuevoCliente.nombre}
                onChangeText={(val) =>
                  setNuevoCliente({ ...nuevoCliente, nombre: val })
                }
                autoCapitalize="words"
                maxLength={150}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="Número de teléfono"
                value={nuevoCliente.telefono}
                onChangeText={(val) =>
                  setNuevoCliente({ ...nuevoCliente, telefono: val })
                }
                keyboardType="phone-pad"
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Municipio *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalMunicipios(true)}>
                <Text
                  style={
                    nuevoCliente.municipio_id > 0
                      ? styles.selectorTextSelected
                      : styles.selectorTextPlaceholder
                  }>
                  {nuevoCliente.municipio_id > 0
                    ? municipios.find((m) => m.id === nuevoCliente.municipio_id)
                        ?.nombre
                    : 'Seleccionar municipio'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalNuevo(false)}
                disabled={guardando}>
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={guardarCliente}
                disabled={guardando}>
                {guardando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Municipios */}
      <Modal
        visible={modalMunicipios}
        animationType="slide"
        onRequestClose={() => setModalMunicipios(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Municipio</Text>
            <TouchableOpacity onPress={() => setModalMunicipios(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={municipios}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => seleccionarMunicipio(item)}>
                <Text style={styles.listItemTitle}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  summary: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  list: {
    padding: 15,
  },
  clienteCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clienteInfo: {
    gap: 4,
  },
  clienteNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clienteCedula: {
    fontSize: 15,
    color: '#004080',
    fontWeight: '600',
  },
  clienteTelefono: {
    fontSize: 14,
    color: '#666',
  },
  clienteMunicipio: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  selector: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  selectorTextSelected: {
    fontSize: 15,
    color: '#333',
  },
  selectorTextPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
  modal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemTitle: {
    fontSize: 16,
    color: '#333',
  },
});