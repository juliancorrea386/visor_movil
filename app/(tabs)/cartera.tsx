// app/(tabs)/cartera.tsx - ACTUALIZADO para manejar datos agrupados por cliente
import { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { obtenerMunicipiosCache } from '@/src/database/db';
import api from '@/src/config/api';

type Cotizacion = {
    id: number;
    numero_cotizacion: string;
    fecha: string;
    total: number;
    saldo: number;
};

type ClienteCartera = {
    id: string;
    nombre: string;
    municipio: string;
    cotizaciones: Cotizacion[];
};

type Municipio = {
    id: number;
    nombre: string;
};

export default function CarteraScreen() {
    const [cartera, setCartera] = useState<ClienteCartera[]>([]);
    const [carteraFiltrada, setCarteraFiltrada] = useState<ClienteCartera[]>([]);
    const [cargando, setCargando] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [fechaDesde, setFechaDesde] = useState(new Date(new Date().getFullYear(), 0, 1)); // 1 enero del año actual
    const [fechaHasta, setFechaHasta] = useState(new Date());
    const [municipioSeleccionado, setMunicipioSeleccionado] = useState<number>(0);

    // Modales
    const [modalFechaDesde, setModalFechaDesde] = useState(false);
    const [modalFechaHasta, setModalFechaHasta] = useState(false);
    const [modalMunicipios, setModalMunicipios] = useState(false);

    // Datos para filtros
    const [municipios, setMunicipios] = useState<Municipio[]>([]);
    const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        aplicarFiltros();
    }, [busqueda, cartera]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            // Cargar municipios
            const munis = await obtenerMunicipiosCache();
            setMunicipios(munis as Municipio[]);

            // Cargar cartera desde servidor
            await cargarCartera();
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const cargarCartera = async () => {
        try {
            // Construir query params
            const params: any = {
                desde: formatearFechaISO(fechaDesde),
                hasta: formatearFechaISO(fechaHasta),
            };

            if (municipioSeleccionado > 0) {
                params.municipios = municipioSeleccionado.toString();
            }

            const response = await api.get('/cartera', { params });
            const datos = response.data || [];

            const datosSanitizados = datos.map((cliente: ClienteCartera) => ({
                ...cliente,
                cotizaciones: cliente.cotizaciones.map(c => ({
                    ...c,
                    total: Number(c.total),
                    saldo: Number(c.saldo),
                }))
            }));
            setCartera(datosSanitizados);
            console.log(`✅ ${datos.length} clientes en cartera`);
        } catch (error) {
            console.error('Error cargando cartera:', error);
            Alert.alert('Error', 'No se pudo cargar la cartera');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarCartera();
        setRefreshing(false);
    };

    const aplicarFiltros = () => {
        let filtrada = [...cartera];

        // Filtro por búsqueda (nombre o cédula)
        if (busqueda.trim()) {
            filtrada = filtrada.filter(
                (c) =>
                    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                    c.id.toLowerCase().includes(busqueda.toLowerCase())
            );
        }

        setCarteraFiltrada(filtrada);
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setMunicipioSeleccionado(0);
        setFechaDesde(new Date(new Date().getFullYear(), 0, 1));
        setFechaHasta(new Date());
        cargarCartera();
    };

    const seleccionarMunicipio = (municipio: Municipio) => {
        setMunicipioSeleccionado(municipio.id);
        setModalMunicipios(false);
        // Recargar cartera con el nuevo filtro
        setTimeout(() => cargarCartera(), 100);
    };

    const cambiarFechaDesde = (event: any, selectedDate?: Date) => {
        setModalFechaDesde(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaDesde(selectedDate);
            // Recargar cartera con el nuevo filtro
            setTimeout(() => cargarCartera(), 100);
        }
    };

    const cambiarFechaHasta = (event: any, selectedDate?: Date) => {
        setModalFechaHasta(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaHasta(selectedDate);
            // Recargar cartera con el nuevo filtro
            setTimeout(() => cargarCartera(), 100);
        }
    };

    const toggleCliente = (clienteId: string) => {
        if (clienteExpandido === clienteId) {
            setClienteExpandido(null);
        } else {
            setClienteExpandido(clienteId);
        }
    };

    const verDetalleCliente = (cliente: ClienteCartera) => {
        const totalDeuda = cliente.cotizaciones.reduce((sum, c) => sum + c.saldo, 0);
        const totalFacturado = cliente.cotizaciones.reduce((sum, c) => sum + c.total, 0);
        const porcentajePagado = ((totalFacturado - totalDeuda) / totalFacturado * 100).toFixed(1);

        const detalleCotizaciones = cliente.cotizaciones.map(cot =>
            `${cot.numero_cotizacion} - ${formatearFechaCorta(new Date(cot.fecha))}\n  Total: $${cot.total.toLocaleString()} | Saldo: $${cot.saldo.toLocaleString()}`
        ).join('\n\n');

        Alert.alert(
            `💰 ${cliente.nombre}`,
            `
CC: ${cliente.id}
Municipio: ${cliente.municipio || 'N/A'}

📊 Resumen:
Total Facturado: $${totalFacturado.toLocaleString()}
Total Abonado: $${(totalFacturado - totalDeuda).toLocaleString()}
Saldo Pendiente: $${totalDeuda.toLocaleString()}
% Pagado: ${porcentajePagado}%

📋 Cotizaciones (${cliente.cotizaciones.length}):
${detalleCotizaciones}
      `.trim()
        );
    };

    const calcularTotales = () => {
        let totalDeuda = 0;
        let totalFacturado = 0;
        let totalCotizaciones = 0;

        carteraFiltrada.forEach(cliente => {
            cliente.cotizaciones.forEach(cot => {
                totalDeuda += cot.saldo;
                totalFacturado += cot.total;
                totalCotizaciones++;
            });
        });

        const totalAbonado = totalFacturado - totalDeuda;

        return { totalDeuda, totalAbonado, totalFacturado, totalCotizaciones };
    };

    const renderCliente = ({ item }: { item: ClienteCartera }) => {
        const totalDeuda = item.cotizaciones.reduce((sum, c) => sum + c.saldo, 0);
        const totalFacturado = item.cotizaciones.reduce((sum, c) => sum + c.total, 0);
        const porcentajePagado = ((totalFacturado - totalDeuda) / totalFacturado * 100).toFixed(0);
        const expandido = clienteExpandido === item.id;

        return (
            <View style={styles.card}>
                <TouchableOpacity
                    onPress={() => toggleCliente(item.id)}
                    onLongPress={() => verDetalleCliente(item)}
                    activeOpacity={0.7}>
                    <View style={styles.cardHeader}>
                        <View style={styles.clienteInfo}>
                            <Text style={styles.clienteNombre}>{item.nombre}</Text>
                            <Text style={styles.clienteCedula}>CC: {item.id}</Text>
                            {item.municipio && (
                                <Text style={styles.municipio}>📍 {item.municipio}</Text>
                            )}
                        </View>
                        <Text style={styles.expandIcon}>{expandido ? '▼' : '▶'}</Text>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${porcentajePagado}%` as `${number}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{porcentajePagado}% pagado</Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.montoContainer}>
                            <Text style={styles.montoLabel}>Total:</Text>
                            <Text style={styles.montoValue}>${totalFacturado.toLocaleString()}</Text>
                        </View>
                        <View style={styles.montoContainer}>
                            <Text style={styles.montoLabel}>Saldo:</Text>
                            <Text style={[styles.montoValue, styles.montoSaldo]}>
                                ${totalDeuda.toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.montoContainer}>
                            <Text style={styles.montoLabel}>Cotizaciones:</Text>
                            <Text style={styles.montoValue}>{item.cotizaciones.length}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Detalles expandidos */}
                {expandido && (
                    <View style={styles.detallesContainer}>
                        <Text style={styles.detallesTitulo}>Cotizaciones:</Text>
                        {item.cotizaciones.map((cot) => (
                            <View key={cot.id} style={styles.cotizacionItem}>
                                <View style={styles.cotizacionInfo}>
                                    <Text style={styles.cotizacionNumero}>{cot.numero_cotizacion}</Text>
                                    <Text style={styles.cotizacionFecha}>
                                        {formatearFechaCorta(new Date(cot.fecha))}
                                    </Text>
                                </View>
                                <View style={styles.cotizacionMontos}>
                                    <Text style={styles.cotizacionTotal}>Total: ${cot.total.toLocaleString()}</Text>
                                    <Text style={styles.cotizacionSaldo}>Saldo: ${cot.saldo.toLocaleString()}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const totales = calcularTotales();
    const municipioNombre = municipioSeleccionado
        ? municipios.find((m) => m.id === municipioSeleccionado)?.nombre
        : null;

    return (
        <View style={styles.container}>
            {/* Filtros */}
            <View style={styles.filtrosContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o cédula..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                    importantForAutofill="no"
                />

                <View style={styles.filtrosRow}>
                    <TouchableOpacity
                        style={styles.filtroButton}
                        onPress={() => setModalMunicipios(true)}>
                        <Text style={styles.filtroButtonText}>
                            {municipioNombre || '📍 Municipio'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filtroButton}
                        onPress={() => setModalFechaDesde(true)}>
                        <Text style={styles.filtroButtonText}>
                            📅 {formatearFechaCorta(fechaDesde)}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filtroButton}
                        onPress={() => setModalFechaHasta(true)}>
                        <Text style={styles.filtroButtonText}>
                            📅 {formatearFechaCorta(fechaHasta)}
                        </Text>
                    </TouchableOpacity>
                </View>

                {(municipioSeleccionado > 0 || busqueda) && (
                    <TouchableOpacity style={styles.limpiarButton} onPress={limpiarFiltros}>
                        <Text style={styles.limpiarButtonText}>🗑️ Limpiar filtros</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Contador */}
            <View style={styles.summary}>
                <Text style={styles.summaryText}>
                    {carteraFiltrada.length} cliente{carteraFiltrada.length !== 1 ? 's' : ''} • {totales.totalCotizaciones} cotización{totales.totalCotizaciones !== 1 ? 'es' : ''}
                </Text>
            </View>

            {/* Lista */}
            {cargando ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#004080" />
                    <Text style={styles.loadingText}>Cargando cartera...</Text>
                </View>
            ) : carteraFiltrada.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>💰</Text>
                    <Text style={styles.emptyTitle}>No hay cartera</Text>
                    <Text style={styles.emptySubtitle}>
                        {busqueda || municipioSeleccionado
                            ? 'No se encontraron resultados con los filtros aplicados'
                            : 'No hay cotizaciones pendientes'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={carteraFiltrada}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCliente}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}

            {/* Modal Fecha Desde */}
            {modalFechaDesde && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={modalFechaDesde}
                    onRequestClose={() => setModalFechaDesde(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Fecha Desde</Text>
                                <TouchableOpacity onPress={() => setModalFechaDesde(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={fechaDesde}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={cambiarFechaDesde}
                                maximumDate={fechaHasta}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerBoton}
                                    onPress={() => setModalFechaDesde(false)}>
                                    <Text style={styles.datePickerBotonTexto}>Aceptar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal Fecha Hasta */}
            {modalFechaHasta && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={modalFechaHasta}
                    onRequestClose={() => setModalFechaHasta(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Fecha Hasta</Text>
                                <TouchableOpacity onPress={() => setModalFechaHasta(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={fechaHasta}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={cambiarFechaHasta}
                                minimumDate={fechaDesde}
                                maximumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerBoton}
                                    onPress={() => setModalFechaHasta(false)}>
                                    <Text style={styles.datePickerBotonTexto}>Aceptar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal Municipios */}
            <Modal
                visible={modalMunicipios}
                animationType="slide"
                onRequestClose={() => setModalMunicipios(false)}>
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Seleccionar Municipio</Text>
                        <TouchableOpacity onPress={() => setModalMunicipios(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => {
                            setMunicipioSeleccionado(0);
                            setModalMunicipios(false);
                            setTimeout(() => cargarCartera(), 100);
                        }}>
                        <Text style={[styles.listItemTitle, styles.listItemAll]}>
                            Todos los municipios
                        </Text>
                    </TouchableOpacity>

                    <FlatList
                        data={municipios}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.listItem}
                                onPress={() => seleccionarMunicipio(item)}>
                                <Text style={styles.listItemTitle}>{item.nombre}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
}

const formatearFechaISO = (fecha: Date) => {
    return fecha.toISOString().split('T')[0];
};

const formatearFechaCorta = (fecha: Date) => {
    return `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${fecha.getFullYear()}`;
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
    searchInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        marginBottom: 10,
    },
    filtrosRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filtroButton: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    filtroButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    limpiarButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#ffebee',
        borderRadius: 8,
        alignItems: 'center',
    },
    limpiarButtonText: {
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '600',
    },
    totalesContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    totalItem: {
        flex: 1,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    totalDeuda: {
        color: '#f44336',
    },
    totalAbonado: {
        color: '#4CAF50',
    },
    totalDivider: {
        width: 1,
        backgroundColor: '#eee',
        marginHorizontal: 10,
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
    clienteInfo: {
        flex: 1,
    },
    clienteNombre: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    clienteCedula: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    municipio: {
        fontSize: 13,
        color: '#666',
    },
    expandIcon: {
        fontSize: 20,
        color: '#666',
        marginLeft: 10,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    montoContainer: {
        alignItems: 'center',
    },
    montoLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 4,
    },
    montoValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    montoSaldo: {
        color: '#f44336',
    },
    detallesContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    detallesTitulo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 10,
    },
    cotizacionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    cotizacionInfo: {
        flex: 1,
    },
    cotizacionNumero: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#004080',
        marginBottom: 2,
    },
    cotizacionFecha: {
        fontSize: 11,
        color: '#999',
    },
    cotizacionMontos: {
        alignItems: 'flex-end',
    },
    cotizacionTotal: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    cotizacionSaldo: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#f44336',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: 15,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
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
    listItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    listItemTitle: {
        fontSize: 16,
        color: '#333',
    },
    listItemAll: {
        color: '#004080',
        fontWeight: 'bold',
    },
});