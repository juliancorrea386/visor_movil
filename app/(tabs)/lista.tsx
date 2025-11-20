// app/(app)/lista.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { obtenerCotizaciones, obtenerCotizacionPorId } from '@/src/database/db';

export default function ListaCotizacionesScreen() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarCotizaciones();
  }, []);

  const cargarCotizaciones = async () => {
    const cots = await obtenerCotizaciones();
    setCotizaciones(cots);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarCotizaciones();
    setRefreshing(false);
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
      `• ${p.producto_nombre}\n  ${p.cantidad} x $${p.precio_venta.toLocaleString()} = $${p.subtotal.toLocaleString()}`
  )
  .join('\n\n')}

TOTAL: $${cotizacion.total.toLocaleString()}
${cotizacion.tipo === 'credito' ? `SALDO: $${cotizacion.saldo.toLocaleString()}` : ''}
    `.trim();

    Alert.alert('Detalle Cotización', detalles, [{ text: 'Cerrar' }]);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => verDetalle(item.id_local)}
      activeOpacity={0.7}>
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
  );

  return (
    <View style={styles.container}>
      {cotizaciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📋</Text>
          <Text style={styles.emptyMessage}>No hay cotizaciones</Text>
          <Text style={styles.emptyHint}>Crea tu primera cotización</Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {cotizaciones.length} cotización{cotizaciones.length !== 1 ? 'es' : ''}
            </Text>
          </View>
          <FlatList
            data={cotizaciones}
            keyExtractor={(item) => item.id_local.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  card: {
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
});