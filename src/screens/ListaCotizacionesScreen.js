// src/screens/ListaCotizacionesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { obtenerCotizaciones } from '../database/db';

export default function ListaCotizacionesScreen() {
  const [cotizaciones, setCotizaciones] = useState([]);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.numero}>{item.numero_cotizacion}</Text>
        <View style={[
          styles.badge,
          item.sincronizado ? styles.badgeSincronizado : styles.badgePendiente
        ]}>
          <Text style={styles.badgeText}>
            {item.sincronizado ? '✓ Sincronizado' : '⏳ Pendiente'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.cliente}>{item.cliente_nombre}</Text>
      <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.tipo}>{item.tipo.toUpperCase()}</Text>
        <Text style={styles.total}>${item.subtotal.toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {cotizaciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📋</Text>
          <Text style={styles.emptyMessage}>No hay cotizaciones</Text>
        </View>
      ) : (
        <FlatList
          data={cotizaciones}
          keyExtractor={(item) => item.id_local.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const formatearFecha = (fecha) => {
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
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  cliente: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  tipo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 18,
    color: '#666',
  },
});