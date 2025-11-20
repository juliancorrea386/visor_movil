// src/screens/SincronizacionScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  obtenerCotizacionesPendientes,
  marcarComoSincronizada,
  guardarProductosCache,
  guardarClientesCache,
} from '../database/db';
import { sincronizarCotizaciones, descargarDatosIniciales } from '../config/api';

export default function SincronizacionScreen() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState('');

  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    const cots = await obtenerCotizacionesPendientes();
    setPendientes(cots);
  };

  const sincronizar = async () => {
    if (pendientes.length === 0) {
      Alert.alert('Info', 'No hay cotizaciones pendientes');
      return;
    }

    setLoading(true);
    setProgreso('Enviando cotizaciones...');

    try {
      // Preparar datos
      const cotizaciones = pendientes.map(c => ({
        id_local: c.id_local,
        numero_cotizacion: c.numero_cotizacion,
        fecha: c.fecha,
        cliente_id: c.cliente_id,
        tipo: c.tipo,
        productos: c.productos.map(p => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_venta: p.precio_venta,
        })),
      }));

      const resultado = await sincronizarCotizaciones(cotizaciones);

      // Marcar como sincronizadas las exitosas
      for (const r of resultado.detalles) {
        if (r.exito) {
          await marcarComoSincronizada(r.id_local, r.id_servidor);
        }
      }

      Alert.alert(
        'Sincronización Completa',
        `Exitosas: ${resultado.exitosas}\nFallidas: ${resultado.fallidas}`,
        [{ text: 'OK', onPress: cargarPendientes }]
      );
    } catch (error) {
      console.error('Error sincronizando:', error);
      Alert.alert('Error', 'No se pudo sincronizar. Verifica tu conexión.');
    } finally {
      setLoading(false);
      setProgreso('');
    }
  };

  const descargarDatos = async () => {
    setLoading(true);
    setProgreso('Descargando productos y clientes...');

    try {
      const datos = await descargarDatosIniciales();
      
      await guardarProductosCache(datos.productos);
      await guardarClientesCache(datos.clientes);

      Alert.alert(
        'Éxito',
        `Descargados:\n${datos.productos.length} productos\n${datos.clientes.length} clientes`
      );
    } catch (error) {
      console.error('Error descargando datos:', error);
      Alert.alert('Error', 'No se pudieron descargar los datos');
    } finally {
      setLoading(false);
      setProgreso('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📤 Enviar Cotizaciones</Text>
        <Text style={styles.cardSubtitle}>
          {pendientes.length} cotización(es) pendiente(s)
        </Text>
        
        {pendientes.length > 0 && (
          <View style={styles.listContainer}>
            {pendientes.map((c) => (
              <View key={c.id_local} style={styles.pendienteItem}>
                <Text style={styles.pendienteNumero}>{c.numero_cotizacion}</Text>
                <Text style={styles.pendienteCliente}>{c.cliente_nombre}</Text>
                <Text style={styles.pendienteMonto}>${c.subtotal.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={sincronizar}
          disabled={loading || pendientes.length === 0}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Enviando...' : 'Sincronizar Ahora'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📥 Actualizar Datos</Text>
        <Text style={styles.cardSubtitle}>
          Descargar productos y clientes actualizados
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={descargarDatos}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Descargar Datos</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004080" />
          <Text style={styles.loadingText}>{progreso}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  listContainer: {
    marginBottom: 15,
  },
  pendienteItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pendienteNumero: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendienteCliente: {
    fontSize: 14,
    color: '#666',
  },
  pendienteMonto: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#004080',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});