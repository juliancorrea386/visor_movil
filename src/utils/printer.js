// src/utils/printer.js - Compatible con Expo Go
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

/**
 * Formatea un número como moneda colombiana
 */
const formatearMoneda = (valor) => {
  return `$${valor.toLocaleString('es-CO')}`;
};

/**
 * Genera el HTML para la cotización (optimizado para impresoras térmicas de 80mm)
 */
const generarHTMLCotizacion = (cotizacion) => {
  const fecha = new Date(cotizacion.fecha);
  const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${
    (fecha.getMonth() + 1).toString().padStart(2, '0')
  }/${fecha.getFullYear()}`;

  const productosHTML = cotizacion.productos.map(producto => {
    const nombre = producto.producto_nombre || producto.nombre;
    const cantidad = producto.cantidad;
    const precioUnit = producto.precio_venta;
    const totalProd = cantidad * precioUnit;
    const ref = producto.producto_referencia || producto.referencia;

    return `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px solid #ddd;">
          <strong>${nombre}</strong><br>
          ${ref ? `<small style="color: #666;">Ref: ${ref}</small>` : ''}
        </td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #ddd; text-align: center;">${cantidad}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #ddd; text-align: right;">${formatearMoneda(precioUnit)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #ddd; text-align: right;"><strong>${formatearMoneda(totalProd)}</strong></td>
      </tr>
    `;
  }).join('');

  const subtotal = cotizacion.productos.reduce((sum, p) => sum + (p.cantidad * p.precio_venta), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          margin: 10mm;
          size: 80mm auto;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #000;
        }
        
        .empresa {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        
        .empresa-info {
          font-size: 11px;
          line-height: 1.6;
        }
        
        .titulo {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin: 15px 0 5px 0;
        }
        
        .numero-cotizacion {
          text-align: center;
          font-size: 12px;
          margin-bottom: 15px;
        }
        
        .seccion {
          margin: 15px 0;
          padding: 10px 0;
          border-bottom: 1px dashed #000;
        }
        
        .seccion-titulo {
          font-weight: bold;
          margin-bottom: 5px;
          font-size: 13px;
        }
        
        .info-linea {
          margin: 3px 0;
          font-size: 12px;
        }
        
        .tipo-pago {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin: 15px 0;
          padding: 10px;
          background: #f0f0f0;
          border: 2px solid #000;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        
        th {
          background: #000;
          color: #fff;
          padding: 8px 4px;
          text-align: left;
          font-size: 11px;
        }
        
        td {
          font-size: 11px;
        }
        
        .totales {
          margin-top: 15px;
          text-align: right;
        }
        
        .total-linea {
          padding: 5px 0;
          font-size: 13px;
        }
        
        .total-final {
          font-size: 16px;
          font-weight: bold;
          border-top: 2px solid #000;
          padding-top: 10px;
          margin-top: 5px;
        }
        
        .observaciones {
          margin: 15px 0;
          padding: 10px;
          background: #f9f9f9;
          border-left: 3px solid #666;
        }
        
        .disclaimer {
          text-align: center;
          margin-top: 20px;
          padding: 15px 10px;
          border: 2px solid #000;
          background: #f0f0f0;
          font-weight: bold;
          font-size: 11px;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <!-- ENCABEZADO -->
      <div class="header">
        <div class="empresa">TU EMPRESA</div>
        <div class="empresa-info">
          NIT: 123456789-0<br>
          Dirección de tu empresa<br>
          Tel: (123) 456-7890<br>
          Caquetá, Colombia
        </div>
      </div>

      <!-- TÍTULO -->
      <div class="titulo">COTIZACIÓN</div>
      <div class="numero-cotizacion">${cotizacion.numero_cotizacion}</div>

      <!-- INFORMACIÓN GENERAL -->
      <div class="seccion">
        <div class="info-linea"><strong>Fecha:</strong> ${fechaFormateada}</div>
      </div>

      <!-- INFORMACIÓN DEL CLIENTE -->
      <div class="seccion">
        <div class="seccion-titulo">CLIENTE</div>
        <div class="info-linea"><strong>Nombre:</strong> ${cotizacion.cliente_nombre}</div>
        <div class="info-linea"><strong>CC/NIT:</strong> ${cotizacion.cliente_id}</div>
        ${cotizacion.cliente_telefono ? `<div class="info-linea"><strong>Tel:</strong> ${cotizacion.cliente_telefono}</div>` : ''}
        ${cotizacion.cliente_municipio ? `<div class="info-linea"><strong>Ciudad:</strong> ${cotizacion.cliente_municipio}</div>` : ''}
      </div>

      <!-- TIPO DE PAGO -->
      <div class="tipo-pago">
        *** ${cotizacion.tipo === 'contado' ? 'CONTADO' : 'CRÉDITO'} ***
      </div>

      <!-- PRODUCTOS -->
      <table>
        <thead>
          <tr>
            <th>PRODUCTO</th>
            <th style="text-align: center;">CANT</th>
            <th style="text-align: right;">P.UNIT</th>
            <th style="text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${productosHTML}
        </tbody>
      </table>

      <!-- TOTALES -->
      <div class="totales">
        <div class="total-linea">
          <strong>SUBTOTAL:</strong> ${formatearMoneda(subtotal)}
        </div>
        <div class="total-final">
          <strong>TOTAL:</strong> ${formatearMoneda(cotizacion.total)}
        </div>
        ${cotizacion.tipo === 'credito' && cotizacion.saldo > 0 ? `
          <div class="total-linea" style="color: #d32f2f;">
            <strong>SALDO:</strong> ${formatearMoneda(cotizacion.saldo)}
          </div>
        ` : ''}
      </div>

      <!-- OBSERVACIONES -->
      ${cotizacion.observaciones && cotizacion.observaciones.trim() ? `
        <div class="observaciones">
          <div class="seccion-titulo">OBSERVACIONES:</div>
          <div style="margin-top: 5px;">${cotizacion.observaciones}</div>
        </div>
      ` : ''}

      <!-- DISCLAIMER -->
      <div class="disclaimer">
        ESTA COTIZACIÓN NO ES VÁLIDA<br>
        COMO FACTURA ELECTRÓNICA
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Gracias por su preferencia
      </div>
    </body>
    </html>
  `;
};

/**
 * Imprime una cotización (genera PDF y abre opciones de impresión)
 */
export const imprimirCotizacion = async (cotizacion) => {
  try {
    const html = generarHTMLCotizacion(cotizacion);
    
    // Generar PDF
    const { uri } = await Print.printAsync({
      html,
      width: 226, // 80mm en puntos (80mm = 226.77 puntos)
      height: 842, // altura automática
    });

    return { success: true, uri };
  } catch (error) {
    console.error('Error imprimiendo:', error);
    return { 
      success: false, 
      error: error.message || 'Error desconocido al imprimir' 
    };
  }
};

/**
 * Comparte el PDF de la cotización
 */
export const compartirCotizacion = async (cotizacion) => {
  try {
    const html = generarHTMLCotizacion(cotizacion);
    
    // Generar PDF
    const { uri } = await Print.printToFileAsync({
      html,
      width: 226,
      height: 842,
    });

    // Compartir
    await shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
    });

    return { success: true };
  } catch (error) {
    console.error('Error compartiendo:', error);
    return { 
      success: false, 
      error: error.message || 'Error al compartir' 
    };
  }
};

/**
 * Funciones dummy para compatibilidad
 * (No son necesarias con expo-print, pero las dejamos para no romper el código)
 */
export const buscarImpresoras = async () => {
  return [];
};

export const conectarImpresora = async (direccionMAC) => {
  return { success: true };
};

export const desconectarImpresora = async () => {
  return { success: true };
};

export const verificarConexionImpresora = async () => {
  return true;
};

export const imprimirPrueba = async () => {
  const htmlPrueba = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Courier New', monospace;
          text-align: center;
          padding: 20px;
          max-width: 80mm;
          margin: 0 auto;
        }
        h1 { font-size: 20px; margin: 20px 0; }
        p { font-size: 14px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>IMPRESIÓN DE PRUEBA</h1>
      <p>Si puedes leer esto,<br>
      el sistema de impresión está<br>
      funcionando correctamente.</p>
    </body>
    </html>
  `;

  try {
    await Print.printAsync({ html: htmlPrueba });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};