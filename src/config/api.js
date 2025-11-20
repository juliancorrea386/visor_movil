// src/config/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

// ⚠️ CAMBIAR ESTA URL POR LA DE TU SERVIDOR
const API_BASE_URL = 'http://172.16.17.154:4000/api'; // Cambiar por tu IP local o servidor

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor para agregar el token JWT a todas las peticiones
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error obteniendo token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor para manejar errores de respuesta
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si es error 401 (no autorizado), limpiar sesión
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('usuario');
    }
    return Promise.reject(error);
  }
);

// ==================== AUTENTICACIÓN ====================

/**
 * Inicia sesión
 */
export const login = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('usuario', JSON.stringify(response.data.usuario));
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Error al iniciar sesión'
    };
  }
};

/**
 * Cierra sesión
 */
export const logout = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    return { success: true };
  } catch (error) {
    console.error('❌ Error en logout:', error);
    return { success: false };
  }
};

/**
 * Verifica si hay sesión activa
 */
export const verificarSesion = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const usuario = await AsyncStorage.getItem('usuario');
    
    if (token && usuario) {
      return {
        autenticado: true,
        usuario: JSON.parse(usuario)
      };
    }
    
    return { autenticado: false };
  } catch (error) {
    console.error('❌ Error verificando sesión:', error);
    return { autenticado: false };
  }
};

// ==================== SINCRONIZACIÓN ====================

/**
 * Verifica si hay conexión a internet
 */
export const verificarConexion = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.isInternetReachable;
  } catch (error) {
    console.error('❌ Error verificando conexión:', error);
    return false;
  }
};

/**
 * Sincroniza cotizaciones pendientes con el servidor
 */
export const sincronizarCotizaciones = async (cotizaciones) => {
  try {
    const tieneConexion = await verificarConexion();
    if (!tieneConexion) {
      throw new Error('No hay conexión a internet');
    }

    const response = await api.post('/sync/cotizaciones', { cotizaciones });
    
    console.log('✅ Sincronización exitosa:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error sincronizando:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al sincronizar'
    };
  }
};

/**
 * Descarga datos iniciales (productos, clientes, municipios)
 */
export const descargarDatosIniciales = async () => {
  try {
    const tieneConexion = await verificarConexion();
    if (!tieneConexion) {
      throw new Error('No hay conexión a internet');
    }

    const response = await api.get('/sync/datos-iniciales');
    
    console.log('✅ Datos descargados:', {
      productos: response.data.productos?.length || 0,
      clientes: response.data.clientes?.length || 0,
      municipios: response.data.municipios?.length || 0
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error descargando datos:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al descargar datos'
    };
  }
};

/**
 * Configura la URL base de la API
 */
export const configurarAPIUrl = (nuevaUrl) => {
  api.defaults.baseURL = nuevaUrl;
  console.log('✅ URL de API actualizada:', nuevaUrl);
};

/**
 * Obtiene la URL actual de la API
 */
export const obtenerAPIUrl = () => {
  return api.defaults.baseURL;
};

/**
 * Test de conexión al servidor
 */
export const testConexion = async () => {
  try {
    const tieneInternet = await verificarConexion();
    if (!tieneInternet) {
      return {
        success: false,
        error: 'No hay conexión a internet'
      };
    }

    await api.get('/clientes'); // Endpoint opcional
    return {
      success: true,
      mensaje: 'Conexión exitosa con el servidor'
    };
  } catch (error) {
    console.error('❌ Error test conexión:', error);
    return {
      success: false,
      error: 'No se pudo conectar al servidor'
    };
  }
};

export default api;