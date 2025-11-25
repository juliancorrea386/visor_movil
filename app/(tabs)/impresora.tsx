// app/(tabs)/impresora.tsx - Versión Expo compatible
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { imprimirPrueba } from '@/src/utils/printer';

export default function ImpresoraScreen() {
  const [imprimiendo, setImprimiendo] = useState(false);

  const pruebaImpresion = async () => {
    setImprimiendo(true);
    try {
      const resultado = await imprimirPrueba();
      
      if (resultado.success) {
        Alert.alert('✅ Éxito', 'Página de prueba lista para imprimir');
      } else {
        Alert.alert('❌ Error', 'No se pudo generar la impresión: ' + resultado.error);
      }
    } catch (error: any) {
      console.error('Error imprimiendo prueba:', error);
      Alert.alert('Error', 'Error al imprimir: ' + error.message);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Estado de impresión */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖨️ Sistema de Impresión</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>ℹ️</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Impresión por PDF</Text>
            <Text style={styles.infoText}>
              Las cotizaciones se generan como PDF optimizado para impresoras térmicas de 80mm.
              Puedes imprimirlas directamente o compartirlas.
            </Text>
          </View>
        </View>
      </View>

      {/* Botón de prueba */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Probar Impresión</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={pruebaImpresion}
          disabled={imprimiendo}>
          {imprimiendo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonIcon}>🖨️</Text>
              <Text style={styles.buttonText}>Imprimir Página de Prueba</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.buttonHint}>
          Esto abrirá el diálogo de impresión de tu dispositivo
        </Text>
      </View>

      {/* Instrucciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Cómo Imprimir</Text>
        
        <View style={styles.instruccionesCard}>
          <View style={styles.paso}>
            <View style={styles.pasoNumero}>
              <Text style={styles.pasoNumeroTexto}>1</Text>
            </View>
            <Text style={styles.pasoTexto}>
              Ve a la lista de cotizaciones
            </Text>
          </View>

          <View style={styles.paso}>
            <View style={styles.pasoNumero}>
              <Text style={styles.pasoNumeroTexto}>2</Text>
            </View>
            <Text style={styles.pasoTexto}>
              Presiona el botón "🖨️ Imprimir" en cualquier cotización
            </Text>
          </View>

          <View style={styles.paso}>
            <View style={styles.pasoNumero}>
              <Text style={styles.pasoNumeroTexto}>3</Text>
            </View>
            <Text style={styles.pasoTexto}>
              Selecciona tu impresora y confirma
            </Text>
          </View>
        </View>
      </View>

      {/* Características */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Características</Text>
        
        <View style={styles.caracteristicasContainer}>
          <View style={styles.caracteristica}>
            <Text style={styles.caracteristicaIcono}>📄</Text>
            <View style={styles.caracteristicaTexto}>
              <Text style={styles.caracteristicaTitulo}>Formato Optimizado</Text>
              <Text style={styles.caracteristicaDescripcion}>
                Diseño específico para impresoras térmicas de 80mm
              </Text>
            </View>
          </View>

          <View style={styles.caracteristica}>
            <Text style={styles.caracteristicaIcono}>📱</Text>
            <View style={styles.caracteristicaTexto}>
              <Text style={styles.caracteristicaTitulo}>Compatible</Text>
              <Text style={styles.caracteristicaDescripcion}>
                Funciona con cualquier impresora conectada a tu dispositivo
              </Text>
            </View>
          </View>

          <View style={styles.caracteristica}>
            <Text style={styles.caracteristicaIcono}>🔄</Text>
            <View style={styles.caracteristicaTexto}>
              <Text style={styles.caracteristicaTitulo}>Compartir</Text>
              <Text style={styles.caracteristicaDescripcion}>
                También puedes compartir las cotizaciones por WhatsApp, Email, etc.
              </Text>
            </View>
          </View>

          <View style={styles.caracteristica}>
            <Text style={styles.caracteristicaIcono}>⚡</Text>
            <View style={styles.caracteristicaTexto}>
              <Text style={styles.caracteristicaTitulo}>Rápido</Text>
              <Text style={styles.caracteristicaDescripcion}>
                Genera e imprime cotizaciones en segundos
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Nota técnica */}
      <View style={styles.section}>
        <View style={styles.notaCard}>
          <Text style={styles.notaIcon}>💡</Text>
          <View style={styles.notaContenido}>
            <Text style={styles.notaTitulo}>Nota Técnica</Text>
            <Text style={styles.notaTexto}>
              Este sistema genera PDFs optimizados para impresoras térmicas.
              El formato está diseñado para un ancho de 80mm, que es el estándar
              para la mayoría de impresoras de recibos.
            </Text>
          </View>
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoIconText: {
    fontSize: 32,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPrimary: {
    backgroundColor: '#004080',
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  instruccionesCard: {
    gap: 15,
  },
  paso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pasoNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoNumeroTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pasoTexto: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    paddingTop: 4,
  },
  caracteristicasContainer: {
    gap: 15,
  },
  caracteristica: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  caracteristicaIcono: {
    fontSize: 28,
  },
  caracteristicaTexto: {
    flex: 1,
  },
  caracteristicaTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  caracteristicaDescripcion: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  notaCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9C4',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  notaIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  notaContenido: {
    flex: 1,
  },
  notaTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 4,
  },
  notaTexto: {
    fontSize: 13,
    color: '#F57F17',
    lineHeight: 18,
  },
});