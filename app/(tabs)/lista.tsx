// app/(tabs)/lista.tsx - Versión con impresión
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { obtenerCotizaciones, obtenerCotizacionPorId } from '@/src/database/db';
import DateTimePicker from '@react-native-community/datetimepicker';
import { imprimirCotizacion } from '@/src/utils/printer';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ListaCotizacionesScreen() {
  const router = useRouter();
  const [todasCotizaciones, setTodasCotizaciones] = useState<any[]>([]);
  const [cotizacionesFiltradas, setCotizacionesFiltradas] = useState<any[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<'hoy' | 'semana' | 'mes' | 'todas'>('hoy');
  const [imprimiendo, setImprimiendo] = useState<number | null>(null);
  const [impresoraConectada, setImpresoraConectada] = useState<any>(null);

  useEffect(() => {
    cargarCotizaciones();
    verificarImpresora();
  }, []);

  useEffect(() => {
    aplicarFiltro();
  }, [fechaSeleccionada, todasCotizaciones, filtroActivo]);

  const verificarImpresora = async () => {
    try {
      const guardada = await AsyncStorage.getItem('impresora_guardada');
      if (guardada) {
        setImpresoraConectada(JSON.parse(guardada));
      }
    } catch (error) {
      console.error('Error verificando impresora:', error);
    }
  };

  const cargarCotizaciones = async () => {
    const cots = await obtenerCotizaciones();
    setTodasCotizaciones(cots);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarCotizaciones();
    await verificarImpresora();
    setRefreshing(false);
  };

  const aplicarFiltro = () => {
    let filtradas = [...todasCotizaciones];

    if (filtroActivo === 'hoy') {
      const hoy = formatearFechaISO(fechaSeleccionada);
      filtradas = filtradas.filter(c => c.fecha === hoy);
    } else if (filtroActivo === 'semana') {
      const inicioSemana = new Date(fechaSeleccionada);
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(finSemana.getDate() + 6);
      
      filtradas = filtradas.filter(c => {
        const fecha = new Date(c.fecha);
        return fecha >= inicioSemana && fecha <= finSemana;
      });
    } else if (filtroActivo === 'mes') {
      const mes = fechaSeleccionada.getMonth();
      const año = fechaSeleccionada.getFullYear();
      
      filtradas = filtradas.filter(c => {
        const fecha = new Date(c.fecha);
        return fecha.getMonth() === mes && fecha.getFullYear() === año;
      });
    }

    setCotizacionesFiltradas(filtradas);
  };

  const cambiarFecha = (event: any, selectedDate?: Date) => {
    setMostrarDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaSeleccionada(selectedDate);
    }
  };

  const verDetalle = async (idLocal: number) => {
    const cotizacion = await obtenerCotizacionPorId(idLocal);
    if (!cotizacion) return;

    const detalles = `
📋 ${cotizacion.numero_cotizacion}
👤 ${cotizacion.cliente_nombre}
📞 ${cotizacion.cliente_telefono || 'N/A'}
📍 ${cotizacion.cliente_municipio || 'N/A'}
💰 Tipo: ${cotizacion.tipo.toUpperCase()}
📅 ${formatearFecha(cotizacion.fecha)}

PRODUCTOS:
${cotizacion.productos
  .map(
    (p: any) =>
      `• ${p.producto_nombre}\n  ${p.cantidad} x ${p.precio_venta.toLocaleString()} = ${p.subtotal.toLocaleString()}`
  )
  .join('\n\n')}

TOTAL: ${cotizacion.total.toLocaleString()}
${cotizacion.tipo === 'credito' ? `SALDO: ${cotizacion.saldo.toLocaleString()}` : ''}
    `.trim();

    Alert.alert('Detalle Cotización', detalles, [
      { text: 'Cerrar', style: 'cancel' },
      { 
        text: '✏️ Editar', 
        onPress: () => router.push({
          pathname: '/(tabs)/editar-cotizacion',
          params: { id: idLocal }
        })
      },
      {
        text: '🖨️ Imprimir',
        onPress: () => manejarImpresion(idLocal)
      }
    ]);
  };

  const manejarImpresion = async (idLocal: number) => {
    if (!impresoraConectada) {
      Alert.alert(
        'Sin Impresora',
        'No hay una impresora conectada. ¿Deseas configurar una ahora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Configurar', 
            onPress: () => router.push('/(tabs)/impresora')
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Imprimir Cotización',
      `¿Deseas imprimir esta cotización en ${impresoraConectada.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Imprimir', onPress: () => imprimirCot(idLocal) }
      ]
    );
  };

  const imprimirCot = async (idLocal: number) => {
    setImprimiendo(idLocal);
    
    try {
      const cotizacion = await obtenerCotizacionPorId(idLocal);
      
      if (!cotizacion) {
        Alert.alert('Error', 'No se encontró la cotización');
        return;
      }

      const resultado = await imprimirCotizacion(cotizacion);

      if (resultado.success) {
        Alert.alert('✅ Éxito', 'Cotización impresa correctamente');
      } else {
        Alert.alert(
          '❌ Error de Impresión',
          resultado.error || 'No se pudo imprimir la cotización. Verifica que la impresora esté encendida y conectada.',
          [
            { text: 'Reintentar', onPress: () => imprimirCot(idLocal) },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error imprimiendo cotización:', error);
      Alert.alert(
        'Error',
        'Error al imprimir: ' + error.message,
        [
          { text: 'Configurar Impresora', onPress: () => router.push('/(tabs)/impresora') },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    } finally {
      setImprimiendo(null);
    }
  };

  const calcularTotales = () => {
    const total = cotizacionesFiltradas.reduce((sum, c) => sum + c.total, 0);
    const sincronizadas = cotizacionesFiltradas.filter(c => c.sincronizado).length;
    const pendientes = cotizacionesFiltradas.filter(c => !c.sincronizado).length;

    return { total, sincronizadas, pendientes };
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => verDetalle(item.id_local)}
        activeOpacity={0.7}
        style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.numero}>{item.numero_cotizacion}</Text>
          <View
            style={[
              styles.badge,
              item.sincronizado ? styles.badgeSincronizado : styles.badgePendiente,
            ]}>
            <Text style={styles.badgeText}>
              {item.sincronizado ? '✓ Sync' : '⏳ Pendiente'}
            </Text>
          </View>
        </View>

        <Text style={styles.cliente} numberOfLines={1}>
          {item.cliente_nombre}
        </Text>
        <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.tipo}>{item.tipo.toUpperCase()}</Text>
            <Text style={styles.productos}>{item.productos?.length || 0} productos</Text>
          </View>
          <Text style={styles.total}>${item.total.toLocaleString()}</Text>
        </View>
      </TouchableOpacity>

      {/* Botón de impresión */}
      <TouchableOpacity
        style={styles.printButton}
        onPress={() => manejarImpresion(item.id_local)}
        disabled={imprimiendo === item.id_local}>
        {imprimiendo === item.id_local ? (
          <ActivityIndicator size="small" color="#004080" />
        ) : (
          <>
            <Text style={styles.printIcon}>🖨️</Text>
            <Text style={styles.printText}>Imprimir</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const totales = calcularTotales();

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <View style={styles.botonesRapidos}>
          <TouchableOpacity
            style={[styles.filtroBoton, filtroActivo === 'hoy' && styles.filtroBotonActivo]}
            onPress={() => {
              setFiltroActivo('hoy');
              setFechaSeleccionada(new Date());
            }}>
            <Text style={[styles.filtroBotonTexto, filtroActivo === 'hoy' && styles.filtroBotonTextoActivo]}>
              Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBoton, filtroActivo === 'semana' && styles.filtroBotonActivo]}
            onPress={() => setFiltroActivo('semana')}>
            <Text style={[styles.filtroBotonTexto, filtroActivo === 'semana' && styles.filtroBotonTextoActivo]}>
              Semana
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBoton, filtroActivo === 'mes' && styles.filtroBotonActivo]}
            onPress={() => setFiltroActivo('mes')}>
            <Text style={[styles.filtroBotonTexto, filtroActivo === 'mes' && styles.filtroBotonTextoActivo]}>
              Mes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBoton, filtroActivo === 'todas' && styles.filtroBotonActivo]}
            onPress={() => setFiltroActivo('todas')}>
            <Text style={[styles.filtroBotonTexto, filtroActivo === 'todas' && styles.filtroBotonTextoActivo]}>
              Todas
            </Text>
          </TouchableOpacity>
        </View>

        {filtroActivo !== 'todas' && (
          <TouchableOpacity
            style={styles.selectorFecha}
            onPress={() => setMostrarDatePicker(true)}>
            <Text style={styles.selectorFechaIcono}>📅</Text>
            <Text style={styles.selectorFechaTexto}>
              {formatearFechaLarga(fechaSeleccionada)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Estado de impresora */}
      {impresoraConectada && (
        <View style={styles.impresoraBar}>
          <Text style={styles.impresoraBarIcon}>🖨️</Text>
          <Text style={styles.impresoraBarText}>
            {impresoraConectada.name}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/impresora')}
            style={styles.impresoraBarButton}>
            <Text style={styles.impresoraBarButtonText}>Cambiar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resumen */}
      <View style={styles.resumen}>
        <View style={styles.resumenItem}>
          <Text style={styles.resumenValor}>{cotizacionesFiltradas.length}</Text>
          <Text style={styles.resumenLabel}>Total</Text>
        </View>
        <View style={styles.resumenDivider} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenValor, styles.resumenValorExito]}>{totales.sincronizadas}</Text>
          <Text style={styles.resumenLabel}>Sincronizadas</Text>
        </View>
        <View style={styles.resumenDivider} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenValor, styles.resumenValorAdvertencia]}>{totales.pendientes}</Text>
          <Text style={styles.resumenLabel}>Pendientes</Text>
        </View>
        <View style={styles.resumenDivider} />
        <View style={styles.resumenItem}>
          <Text style={[styles.resumenValor, styles.resumenValorTotal]}>
            ${(totales.total / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.resumenLabel}>Total $</Text>
        </View>
      </View>

      {/* Lista */}
      {cotizacionesFiltradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📋</Text>
          <Text style={styles.emptyMessage}>No hay cotizaciones</Text>
          <Text style={styles.emptyHint}>
            {filtroActivo === 'hoy' ? 'para hoy' : 'en este período'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={cotizacionesFiltradas}
          keyExtractor={(item) => item.id_local.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* DatePicker */}
      {mostrarDatePicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={mostrarDatePicker}
          onRequestClose={() => setMostrarDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Seleccionar Fecha</Text>
                <TouchableOpacity onPress={() => setMostrarDatePicker(false)}>
                  <Text style={styles.datePickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fechaSeleccionada}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={cambiarFecha}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.datePickerBoton}
                  onPress={() => setMostrarDatePicker(false)}>
                  <Text style={styles.datePickerBotonTexto}>Aceptar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const formatearFecha = (fecha: string) => {
  const d = new Date(fecha);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
};

const formatearFechaISO = (fecha: Date) => {
  return fecha.toISOString().split('T')[0];
};

const formatearFechaLarga = (fecha: Date) => {
  const opciones: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return fecha.toLocaleDateString('es-ES', opciones);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtrosContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  botonesRapidos: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filtroBoton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filtroBotonActivo: {
    backgroundColor: '#004080',
  },
  filtroBotonTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filtroBotonTextoActivo: {
    color: '#fff',
  },
  selectorFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  selectorFechaIcono: {
    fontSize: 20,
    marginRight: 8,
  },
  selectorFechaTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  impresoraBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
  },
  impresoraBarIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  impresoraBarText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  impresoraBarButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  impresoraBarButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resumen: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resumenItem: {
    flex: 1,
    alignItems: 'center',
  },
  resumenValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  resumenValorExito: {
    color: '#4CAF50',
  },
  resumenValorAdvertencia: {
    color: '#ff9800',
  },
  resumenValorTotal: {
    color: '#004080',
  },
  resumenLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  resumenDivider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 10,
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  numero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004080',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSincronizado: {
    backgroundColor: '#4CAF50',
  },
  badgePendiente: {
    backgroundColor: '#ff9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cliente: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  fecha: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  tipo: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  productos: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
  },
  printIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  printText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 80,
    marginBottom: 15,
  },
  emptyMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  emptyHint: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerClose: {
    fontSize: 28,
    color: '#666',
  },
  datePickerBoton: {
    backgroundColor: '#004080',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  datePickerBotonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});