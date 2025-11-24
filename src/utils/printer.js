// src/utils/printer.js (JavaScript puro sin TypeScript)
import { 
  BluetoothEscposPrinter,
  BluetoothManager 
} from 'react-native-bluetooth-escpos-printer';

/**
 * Formatea un número como moneda colombiana
 */
const formatearMoneda = (valor) => {
  return `$${valor.toLocaleString('es-CO')}`;
};

/**
 * Ajusta un texto a un ancho específico, truncando si es necesario
 */
const ajustarTexto = (texto, ancho) => {
  if (texto.length <= ancho) {
    return texto.padEnd(ancho);
  }
  return texto.substring(0, ancho - 3) + '...';
};

/**
 * Imprime una cotización en impresora térmica de 80mm
 */
export const imprimirCotizacion = async (cotizacion) => {
  try {
    const ANCHO_TOTAL = 48; // Caracteres por línea en impresora de 80mm
    const LINEA_SEPARADOR = '-'.repeat(ANCHO_TOTAL);

    // Iniciar impresión
    await BluetoothEscposPrinter.printerInit();
    
    // ==================== ENCABEZADO / BANNER ====================
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.setBlob(0); // Tamaño normal
    
    // Espacio para logo
    await BluetoothEscposPrinter.printText('\n', {});
    
    // Nombre de la empresa
    await BluetoothEscposPrinter.setBlob(1); // Tamaño grande
    await BluetoothEscposPrinter.printText('TU EMPRESA\n', {});
    
    await BluetoothEscposPrinter.setBlob(0); // Tamaño normal
    await BluetoothEscposPrinter.printText('NIT: 123456789-0\n', {});
    await BluetoothEscposPrinter.printText('Direccion de tu empresa\n', {});
    await BluetoothEscposPrinter.printText('Tel: (123) 456-7890\n', {});
    await BluetoothEscposPrinter.printText('Caqueta, Colombia\n', {});
    await BluetoothEscposPrinter.printText('\n', {});

    // ==================== TÍTULO ====================
    await BluetoothEscposPrinter.setBlob(1);
    await BluetoothEscposPrinter.printText('COTIZACION\n', {});
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText(`${cotizacion.numero_cotizacion}\n`, {});
    await BluetoothEscposPrinter.printText('\n', {});

    // ==================== INFORMACIÓN DE LA COTIZACIÓN ====================
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    
    // Fecha
    const fecha = new Date(cotizacion.fecha);
    const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${
      (fecha.getMonth() + 1).toString().padStart(2, '0')
    }/${fecha.getFullYear()}`;
    
    await BluetoothEscposPrinter.printText(`Fecha: ${fechaFormateada}\n`, {});
    await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});

    // ==================== INFORMACIÓN DEL CLIENTE ====================
    await BluetoothEscposPrinter.printText('CLIENTE:\n', {});
    await BluetoothEscposPrinter.printText(`Nombre: ${cotizacion.cliente_nombre}\n`, {});
    await BluetoothEscposPrinter.printText(`CC/NIT: ${cotizacion.cliente_id}\n`, {});
    
    if (cotizacion.cliente_telefono) {
      await BluetoothEscposPrinter.printText(`Tel: ${cotizacion.cliente_telefono}\n`, {});
    }
    
    if (cotizacion.cliente_municipio) {
      await BluetoothEscposPrinter.printText(`Ciudad: ${cotizacion.cliente_municipio}\n`, {});
    }
    
    await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});

    // ==================== TIPO DE PAGO ====================
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    const tipoPago = cotizacion.tipo === 'contado' ? 'CONTADO' : 'CREDITO';
    await BluetoothEscposPrinter.setBlob(1);
    await BluetoothEscposPrinter.printText(`*** ${tipoPago} ***\n`, {});
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText('\n', {});

    // ==================== PRODUCTOS ====================
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});
    
    // Encabezados de tabla
    await BluetoothEscposPrinter.printText('PRODUCTO              CANT  P.UNIT   TOTAL\n', {});
    await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});

    // Productos
    let subtotal = 0;
    for (const producto of cotizacion.productos) {
      const nombre = producto.producto_nombre || producto.nombre;
      const cantidad = producto.cantidad;
      const precioUnit = producto.precio_venta;
      const totalProd = cantidad * precioUnit;
      subtotal += totalProd;

      // Nombre del producto
      await BluetoothEscposPrinter.printText(`${ajustarTexto(nombre, 32)}\n`, {});
      
      // Referencia si existe
      if (producto.producto_referencia || producto.referencia) {
        const ref = producto.producto_referencia || producto.referencia;
        await BluetoothEscposPrinter.printText(`  Ref: ${ref}\n`, {});
      }

      // Cantidad, precio unitario y total
      const cantStr = cantidad.toString().padStart(3);
      const precioStr = formatearMoneda(precioUnit).padStart(9);
      const totalStr = formatearMoneda(totalProd).padStart(10);
      const lineaDetalles = `  ${cantStr} x ${precioStr} = ${totalStr}\n`;
      
      await BluetoothEscposPrinter.printText(lineaDetalles, {});
      await BluetoothEscposPrinter.printText('\n', {});
    }

    // ==================== TOTALES ====================
    await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});
    
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.RIGHT);
    await BluetoothEscposPrinter.printText(`SUBTOTAL: ${formatearMoneda(subtotal)}\n`, {});
    
    await BluetoothEscposPrinter.setBlob(1);
    await BluetoothEscposPrinter.printText(`TOTAL: ${formatearMoneda(cotizacion.total)}\n`, {});
    await BluetoothEscposPrinter.setBlob(0);

    if (cotizacion.tipo === 'credito' && cotizacion.saldo > 0) {
      await BluetoothEscposPrinter.printText(`SALDO: ${formatearMoneda(cotizacion.saldo)}\n`, {});
    }

    await BluetoothEscposPrinter.printText('\n', {});

    // ==================== OBSERVACIONES ====================
    if (cotizacion.observaciones && cotizacion.observaciones.trim()) {
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
      await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});
      await BluetoothEscposPrinter.printText('OBSERVACIONES:\n', {});
      await BluetoothEscposPrinter.printText(`${cotizacion.observaciones}\n`, {});
      await BluetoothEscposPrinter.printText('\n', {});
    }

    // ==================== DISCLAIMER ====================
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(LINEA_SEPARADOR + '\n', {});
    await BluetoothEscposPrinter.printText('\n', {});
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText(
      'ESTA COTIZACION NO ES VALIDA\n' +
      'COMO FACTURA ELECTRONICA\n',
      {}
    );
    await BluetoothEscposPrinter.printText('\n', {});
    await BluetoothEscposPrinter.printText('Gracias por su preferencia\n', {});
    await BluetoothEscposPrinter.printText('\n\n\n', {});

    // Cortar papel (si la impresora lo soporta)
    try {
      await BluetoothEscposPrinter.printText('\x1B\x69', {});
    } catch (e) {
      // Ignorar si la impresora no soporta corte automático
    }

    return { success: true };
  } catch (error) {
    console.error('Error imprimiendo:', error);
    return { success: false, error: error.message || 'Error desconocido al imprimir' };
  }
};

/**
 * Busca dispositivos Bluetooth disponibles
 */
export const buscarImpresoras = async () => {
  try {
    const dispositivos = await BluetoothManager.scanDevices();
    // Parsear el resultado si viene como string JSON
    if (typeof dispositivos === 'string') {
      return JSON.parse(dispositivos);
    }
    return dispositivos || [];
  } catch (error) {
    console.error('Error buscando impresoras:', error);
    throw new Error(error.message || 'No se pudieron buscar dispositivos Bluetooth');
  }
};

/**
 * Conecta con una impresora Bluetooth
 */
export const conectarImpresora = async (direccionMAC) => {
  try {
    await BluetoothManager.connect(direccionMAC);
    return { success: true };
  } catch (error) {
    console.error('Error conectando impresora:', error);
    return { success: false, error: error.message || 'No se pudo conectar con la impresora' };
  }
};

/**
 * Desconecta la impresora actual
 */
export const desconectarImpresora = async () => {
  try {
    await BluetoothManager.disconnect();
    return { success: true };
  } catch (error) {
    console.error('Error desconectando impresora:', error);
    return { success: false, error: error.message || 'Error al desconectar' };
  }
};

/**
 * Verifica si hay una impresora conectada
 */
export const verificarConexionImpresora = async () => {
  try {
    const isConnected = await BluetoothManager.isConnected();
    return isConnected;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};

/**
 * Imprime una línea de prueba
 */
export const imprimirPrueba = async () => {
  try {
    await BluetoothEscposPrinter.printerInit();
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    
    await BluetoothEscposPrinter.setBlob(1);
    await BluetoothEscposPrinter.printText('IMPRESION DE PRUEBA\n', {});
    
    await BluetoothEscposPrinter.setBlob(0);
    await BluetoothEscposPrinter.printText('\n', {});
    await BluetoothEscposPrinter.printText('Si puedes leer esto,\n', {});
    await BluetoothEscposPrinter.printText('la impresora esta funcionando\n', {});
    await BluetoothEscposPrinter.printText('correctamente.\n', {});
    await BluetoothEscposPrinter.printText('\n\n\n', {});

    return { success: true };
  } catch (error) {
    console.error('Error en impresión de prueba:', error);
    return { success: false, error: error.message || 'Error al imprimir prueba' };
  }
};