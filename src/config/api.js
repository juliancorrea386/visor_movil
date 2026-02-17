// src/config/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Network from 'expo-network';

// Clave para almacenar la URL de la API
const API_URL_KEY = 'api_url';

// URL por defecto
//const DEFAULT_API_URL = 'http://192.168.1.31:4000/api';
const DEFAULT_API_URL = 'http://172.27.19.222:4000/api';
//const DEFAULT_API_URL = 'http://149.130.180.164:4000/api';
/**
 * Obtiene la URL de la API desde AsyncStorage o devuelve la por defecto
 */
const getAPIUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem(API_URL_KEY);
    return savedUrl || DEFAULT_API_URL;
  } catch (error) {
    console.error('Error obteniendo URL de API:', error);
    return DEFAULT_API_URL;
  }
};

// Inicializar axios
let api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cargar URL guardada al inicio
(async () => {
  const savedUrl = await getAPIUrl();
  api.defaults.baseURL = savedUrl;
  console.log('📡 API URL configurada:', savedUrl);
})();

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
      
      // Solo guardar usuario si existe en la respuesta
      if (response.data.usuario) {
        await AsyncStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      } else {
        // Si no viene usuario en la respuesta, crear uno básico
        const usuarioBasico = {
          username: username,
          nombre: response.data.nombre || username,
          rol: response.data.rol || 'vendedor'
        };
        await AsyncStorage.setItem('usuario', JSON.stringify(usuarioBasico));
      }
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.response?.data?.message || 'Error al iniciar sesión'
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
 * Descarga cotizaciones del servidor
 */
export const descargarCotizaciones = async (opciones = {}) => {
  try {
    const tieneConexion = await verificarConexion();
    if (!tieneConexion) {
      throw new Error('No hay conexión a internet');
    }

    // Construir parámetros de filtro
    const params = {};
    if (opciones.desde) params.desde = opciones.desde;
    if (opciones.hasta) params.hasta = opciones.hasta;
    if (opciones.usuario_id) params.usuario_id = opciones.usuario_id;

    const response = await api.get('/sync/cotizaciones', { params });
    
    console.log('✅ Cotizaciones descargadas:', response.data.total);

    return {
      success: true,
      data: response.data.cotizaciones || []
    };
  } catch (error) {
    console.error('❌ Error descargando cotizaciones:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al descargar cotizaciones'
    };
  }
};

/**
 * Configura la URL base de la API
 */
export const configurarAPIUrl = async (nuevaUrl) => {
  try {
    api.defaults.baseURL = nuevaUrl;
    await AsyncStorage.setItem(API_URL_KEY, nuevaUrl);
    console.log('✅ URL de API actualizada:', nuevaUrl);
  } catch (error) {
    console.error('❌ Error guardando URL:', error);
  }
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

    // Usar un endpoint simple que no requiera autenticación
    await api.get('/clientes').catch(() => {
      // Si /health no existe, intentar con otro endpoint
      return api.get('/');
    });
    
    return {
      success: true,
      mensaje: 'Conexión exitosa con el servidor'
    };
  } catch (error) {
    console.error('❌ Error test conexión:', error);
    return {
      success: false,
      error: 'No se pudo conectar al servidor. Verifica la URL.'
    };
  }
};

export default api;