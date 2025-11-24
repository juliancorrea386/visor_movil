// app/(tabs)/editar-cotizacion.tsx
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  actualizarCotizacion,
  obtenerCotizacionPorId,
  obtenerClientesCache,
  obtenerProductosCache,
  eliminarCotizacion,
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

export default function EditarCotizacionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const idCotizacion = parseInt(params.id as string);

  const [cargando, setCargando] = useState(true);
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
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  useEffect(() => {
    cargarCotizacion();
  }, []);

  const cargarCotizacion = async () => {
    setCargando(true);
    try {
      const cotizacion = await obtenerCotizacionPorId(idCotizacion);
      
      if (!cotizacion) {
        Alert.alert('Error', 'No se encontró la cotización');
        router.back();
        return;
      }

      setNumero(cotizacion.numero_cotizacion);
      setCliente({
        id: cotizacion.cliente_id,
        nombre: cotizacion.cliente_nombre,
        telefono: cotizacion.cliente_telefono,
        municipio: cotizacion.cliente_municipio,
      });
      setTipo(cotizacion.tipo);
      setObservaciones(cotizacion.observaciones || '');

      // Convertir productos
      const productosFormateados = cotizacion.productos.map((p: any) => ({
        id: p.producto_id,
        nombre: p.producto_nombre,
        Referencia: p.producto_referencia,
        precio_venta: p.precio_venta,
        cantidad: p.cantidad,
        subtotal: p.subtotal,
      }));
      setProductos(productosFormateados);
    } catch (error) {
      console.error('Error cargando cotización:', error);
      Alert.alert('Error', 'No se pudo cargar la cotización');
      router.back();
    } finally {
      setCargando(false);
    }
  };

  const buscarClientes = async (texto: string) => {
    setBusquedaCliente(texto);
    setCargandoClientes(true);
    
    try {
      const resultados = await obtenerClientesCache(texto);
      setClientes(resultados as Cliente[]);
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setCargandoClientes(false);
    }
  };

  const buscarProductos = async (texto: string) => {
    setBusquedaProducto(texto);
    setCargandoProductos(true);
    
    try {
      const resultados = await obtenerProductosCache(texto);
      setProductosDisponibles(resultados as Producto[]);
    } catch (error) {
      console.error('Error buscando productos:', error);
    } finally {
      setCargandoProductos(false);
    }
  };

  const abrirModalClientes = async () => {
    setModalCliente(true);
    setBusquedaCliente('');
    await buscarClientes('');
  };

  const abrirModalProductos = async () => {
    setModalProducto(true);
    setBusquedaProducto('');
    await buscarProductos('');
  };

  const seleccionarCliente = (cli: Cliente) => {
    setCliente(cli);
    setModalCliente(false);
    setBusquedaCliente('');
  };

  const agregarProducto = (prod: Producto) => {
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

  const actualizarPrecio = (id: number, precio: string) => {
    const precioNum = parseFloat(precio) || 0;
    if (precioNum < 0) return;

    setProductos(
      productos.map((p) =>
        p.id === id
          ? {
              ...p,
              precio_venta: precioNum,
              subtotal: p.cantidad * precioNum,
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

      await actualizarCotizacion(idCotizacion, cotizacion);

      Alert.alert('✅ Éxito', 'Cotización actualizada correctamente', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error actualizando:', error);
      Alert.alert('Error', 'No se pudo actualizar la cotización');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = () => {
    Alert.alert(
      '⚠️ Eliminar Cotización',
      '¿Estás seguro que deseas eliminar esta cotización? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCotizacion(idCotizacion);
              Alert.alert('✅ Eliminada', 'Cotización eliminada correctamente', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la cotización');
            }
          },
        },
      ]
    );
  };

  const irASincronizar = () => {
    Alert.alert(
      '📥 Descargar Datos',
      'Parece que no tienes clientes o productos descargados. ¿Quieres ir a la pantalla de sincronización?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir a Sincronizar', onPress: () => router.push('/(tabs)/sincronizar') },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#004080" />
        <Text style={styles.loadingText}>Cargando cotización...</Text>
      </View>
    );
  }

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
          <TouchableOpacity style={styles.selector} onPress={abrirModalClientes}>
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
            <TouchableOpacity style={styles.addButton} onPress={abrirModalProductos}>
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {productos.map((prod) => (
            <View key={prod.id} style={styles.productoItem}>
              <View style={styles.productoInfo}>
                <Text style={styles.productoNombre}>{prod.nombre}</Text>
                <Text style={styles.productoRef}>{prod.Referencia}</Text>
                
                <View style={styles.precioContainer}>
                  <Text style={styles.precioLabel}>Precio: $</Text>
                  <TextInput
                    style={styles.precioInput}
                    value={prod.precio_venta.toString()}
                    onChangeText={(val) => actualizarPrecio(prod.id, val)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <View style={styles.productoActions}>
                <View style={styles.cantidadContainer}>
                  <Text style={styles.cantidadLabel}>Cant:</Text>
                  <TextInput
                    style={styles.cantidadInput}
                    value={prod.cantidad.toString()}
                    onChangeText={(val) => actualizarCantidad(prod.id, val)}
                    keyboardType="numeric"
                  />
                </View>
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

        {/* Botón eliminar */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.eliminarCotizacionButton} onPress={confirmarEliminar}>
            <Text style={styles.eliminarCotizacionButtonText}>🗑️ Eliminar Cotización</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelarButton}
          onPress={() => router.back()}
          disabled={guardando}>
          <Text style={styles.cancelarButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.guardarButton, guardando && styles.guardarButtonDisabled]}
          onPress={guardar}
          disabled={guardando}>
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.guardarButtonText}>Guardar Cambios</Text>
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

          {cargandoClientes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#004080" />
            </View>
          ) : clientes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No hay clientes</Text>
              <TouchableOpacity style={styles.syncButton} onPress={irASincronizar}>
                <Text style={styles.syncButtonText}>📥 Ir a Sincronizar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={clientes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => seleccionarCliente(item)}>
                  <Text style={styles.listItemTitle}>{item.nombre}</Text>
                  <Text style={styles.listItemSubtitle}>CC: {item.id}</Text>
                </TouchableOpacity>
              )}
            />
          )}
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

          {cargandoProductos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#004080" />
            </View>
          ) : productosDisponibles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No hay productos</Text>
              <TouchableOpacity style={styles.syncButton} onPress={irASincronizar}>
                <Text style={styles.syncButtonText}>📥 Ir a Sincronizar</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
          )}
        </View>
      </Modal>
    </View>
  );
}

// Aquí van los mismos estilos que nueva-cotizacion.tsx, más estos adicionales:
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productoInfo: {
    marginBottom: 10,
  },
  productoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productoRef: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  precioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  precioLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  precioInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    minWidth: 80,
  },
  productoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cantidadLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  cantidadInput: {
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  eliminarButton: {
    fontSize: 24,
  },
  productoSubtotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  eliminarCotizacionButton: {
    backgroundColor: '#ffebee',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  eliminarCotizacionButtonText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelarButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelarButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guardarButton: {
    flex: 2,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});