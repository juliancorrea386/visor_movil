// app/(app)/nueva-cotizacion.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  guardarCotizacion,
  generarNumeroCotizacion,
  obtenerClientesCache,
  obtenerProductosCache,
} from '@/src/database/db';

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string;
  municipio?: string;
};

type Producto = {
  id: number;
  nombre: string;
  precio_venta: number;
  Referencia?: string;
};

type ProductoCotizacion = Producto & {
  cantidad: number;
  subtotal: number;
};

export default function NuevaCotizacionScreen() {
  const router = useRouter();
  const [numero, setNumero] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tipo, setTipo] = useState<'contado' | 'credito'>('contado');
  const [productos, setProductos] = useState<ProductoCotizacion[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Modales
  const [modalCliente, setModalCliente] = useState(false);
  const [modalProducto, setModalProducto] = useState(false);

  // Búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    const num = await generarNumeroCotizacion();
    setNumero(num);
  };

  const buscarClientes = async (texto: string) => {
    setBusquedaCliente(texto);
    const resultados = await obtenerClientesCache(texto);
    setClientes(resultados as Cliente[]);
  };

  const buscarProductos = async (texto: string) => {
    setBusquedaProducto(texto);
    const resultados = await obtenerProductosCache(texto);
    setProductosDisponibles(resultados as Producto[]);
  };

  const seleccionarCliente = (cli: Cliente) => {
    setCliente(cli);
    setModalCliente(false);
    setBusquedaCliente('');
  };

  const agregarProducto = (prod: Producto) => {
    // Verificar si ya está en la lista
    const existe = productos.find((p) => p.id === prod.id);
    if (existe) {
      Alert.alert('Info', 'Este producto ya está agregado');
      return;
    }

    const nuevoProd: ProductoCotizacion = {
      ...prod,
      cantidad: 1,
      subtotal: prod.precio_venta,
    };

    setProductos([...productos, nuevoProd]);
    setModalProducto(false);
    setBusquedaProducto('');
  };

  const actualizarCantidad = (id: number, cantidad: string) => {
    const cant = parseInt(cantidad) || 0;
    if (cant < 0) return;

    setProductos(
      productos.map((p) =>
        p.id === id
          ? {
              ...p,
              cantidad: cant,
              subtotal: cant * p.precio_venta,
            }
          : p
      )
    );
  };

  const eliminarProducto = (id: number) => {
    setProductos(productos.filter((p) => p.id !== id));
  };

  const calcularTotal = () => {
    return productos.reduce((sum, p) => sum + p.subtotal, 0);
  };

  const validarCotizacion = () => {
    if (!cliente) {
      Alert.alert('Error', 'Debes seleccionar un cliente');
      return false;
    }

    if (productos.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un producto');
      return false;
    }

    const hayProductoSinCantidad = productos.some((p) => p.cantidad <= 0);
    if (hayProductoSinCantidad) {
      Alert.alert('Error', 'Todos los productos deben tener cantidad mayor a 0');
      return false;
    }

    return true;
  };

  const guardar = async () => {
    if (!validarCotizacion()) return;

    setGuardando(true);
    try {
      const total = calcularTotal();

      const cotizacion = {
        numero_cotizacion: numero,
        fecha: new Date().toISOString().split('T')[0],
        cliente_id: cliente!.id,
        cliente_nombre: cliente!.nombre,
        cliente_telefono: cliente!.telefono || '',
        cliente_municipio: cliente!.municipio || '',
        tipo,
        subtotal: total,
        total,
        observaciones,
        productos: productos.map((p) => ({
          producto_id: p.id,
          nombre: p.nombre,
          referencia: p.Referencia || '',
          cantidad: p.cantidad,
          precio_venta: p.precio_venta,
        })),
      };

      await guardarCotizacion(cotizacion);

      Alert.alert('Éxito', 'Cotización guardada correctamente', [
        {
          text: 'Ver Lista',
          onPress: () => router.push('/(tabs)/lista'),
        },
        {
          text: 'Nueva',
          onPress: () => {
            // Resetear formulario
            inicializar();
            setCliente(null);
            setProductos([]);
            setObservaciones('');
            setTipo('contado');
          },
        },
      ]);
    } catch (error) {
      console.error('Error guardando:', error);
      Alert.alert('Error', 'No se pudo guardar la cotización');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        {/* Número de cotización */}
        <View style={styles.section}>
          <Text style={styles.label}>Número de Cotización</Text>
          <Text style={styles.numero}>{numero}</Text>
        </View>

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.label}>Cliente *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => {
              buscarClientes('');
              setModalCliente(true);
            }}>
            <Text style={cliente ? styles.selectorTextSelected : styles.selectorTextPlaceholder}>
              {cliente ? `${cliente.nombre} (${cliente.id})` : 'Seleccionar cliente'}
            </Text>
          </TouchableOpacity>
          {cliente && (
            <View style={styles.clienteInfo}>
              <Text style={styles.clienteInfoText}>📞 {cliente.telefono || 'N/A'}</Text>
              <Text style={styles.clienteInfoText}>📍 {cliente.municipio || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Tipo */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de Pago *</Text>
          <View style={styles.tipoContainer}>
            <TouchableOpacity
              style={[styles.tipoButton, tipo === 'contado' && styles.tipoButtonActive]}
              onPress={() => setTipo('contado')}>
              <Text style={tipo === 'contado' ? styles.tipoTextActive : styles.tipoText}>
                Contado
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tipoButton, tipo === 'credito' && styles.tipoButtonActive]}
              onPress={() => setTipo('credito')}>
              <Text style={tipo === 'credito' ? styles.tipoTextActive : styles.tipoText}>
                Crédito
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Productos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Productos *</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                buscarProductos('');
                setModalProducto(true);
              }}>
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {productos.map((prod) => (
            <View key={prod.id} style={styles.productoItem}>
              <View style={styles.productoInfo}>
                <Text style={styles.productoNombre}>{prod.nombre}</Text>
                <Text style={styles.productoRef}>{prod.Referencia}</Text>
                <Text style={styles.productoPrecio}>${prod.precio_venta.toLocaleString()}</Text>
              </View>
              <View style={styles.productoActions}>
                <TextInput
                  style={styles.cantidadInput}
                  value={prod.cantidad.toString()}
                  onChangeText={(val) => actualizarCantidad(prod.id, val)}
                  keyboardType="numeric"
                />
                <TouchableOpacity onPress={() => eliminarProducto(prod.id)}>
                  <Text style={styles.eliminarButton}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.productoSubtotal}>${prod.subtotal.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Observaciones */}
        <View style={styles.section}>
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={styles.textArea}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Notas adicionales..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${calcularTotal().toLocaleString()}</Text>
        </View>
      </ScrollView>

      {/* Botón guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.guardarButton, guardando && styles.guardarButtonDisabled]}
          onPress={guardar}
          disabled={guardando}>
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.guardarButtonText}>Guardar Cotización</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Clientes */}
      <Modal visible={modalCliente} animationType="slide" onRequestClose={() => setModalCliente(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
            <TouchableOpacity onPress={() => setModalCliente(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o cédula..."
            value={busquedaCliente}
            onChangeText={buscarClientes}
            autoFocus
          />
          <FlatList
            data={clientes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => seleccionarCliente(item)}>
                <Text style={styles.listItemTitle}>{item.nombre}</Text>
                <Text style={styles.listItemSubtitle}>
                  CC: {item.id} • {item.municipio || 'N/A'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Modal Productos */}
      <Modal visible={modalProducto} animationType="slide" onRequestClose={() => setModalProducto(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Producto</Text>
            <TouchableOpacity onPress={() => setModalProducto(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            value={busquedaProducto}
            onChangeText={buscarProductos}
            autoFocus
          />
          <FlatList
            data={productosDisponibles}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => agregarProducto(item)}>
                <Text style={styles.listItemTitle}>{item.nombre}</Text>
                <Text style={styles.listItemSubtitle}>
                  {item.Referencia} • ${item.precio_venta.toLocaleString()}
                </Text>
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
  scroll: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  numero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#004080',
  },
  selector: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  selectorTextSelected: {
    fontSize: 16,
    color: '#333',
  },
  selectorTextPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  clienteInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clienteInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  tipoButtonActive: {
    backgroundColor: '#004080',
    borderColor: '#004080',
  },
  tipoText: {
    fontSize: 16,
    color: '#666',
  },
  tipoTextActive: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  productoRef: {
    fontSize: 12,
    color: '#999',
  },
  productoPrecio: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cantidadInput: {
    width: 50,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    fontSize: 16,
  },
  eliminarButton: {
    fontSize: 20,
  },
  productoSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 10,
    minWidth: 80,
    textAlign: 'right',
  },
  textArea: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  guardarButton: {
    backgroundColor: '#004080',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  guardarButtonDisabled: {
    backgroundColor: '#ccc',
  },
  guardarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  searchInput: {
    backgroundColor: '#f9f9f9',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});