// app/(tabs)/cartera.tsx
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
import { obtenerMunicipiosCache, obtenerClientesCache } from '@/src/database/db';
import api from '@/src/config/api';

type Cartera = {
    id: number;
    numero_cotizacion: string;
    fecha: string;
    cliente_id: string;
    cliente_nombre: string;
    municipio?: string;
    subtotal: number;
    abonado: number;
    saldo: number;
    estado: string;
};

type Municipio = {
    id: number;
    nombre: string;
};

type Cliente = {
    id: string;
    nombre: string;
};

export default function CarteraScreen() {
    const [cartera, setCartera] = useState<Cartera[]>([]);
    const [carteraFiltrada, setCarteraFiltrada] = useState<Cartera[]>([]);
    const [cargando, setCargando] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [fechaHasta, setFechaHasta] = useState(new Date());
    const [municipioSeleccionado, setMunicipioSeleccionado] = useState<number>(0);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');

    // Modales
    const [modalFecha, setModalFecha] = useState(false);
    const [modalMunicipios, setModalMunicipios] = useState(false);
    const [modalClientes, setModalClientes] = useState(false);

    // Datos para filtros
    const [municipios, setMunicipios] = useState<Municipio[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        aplicarFiltros();
    }, [busqueda, cartera, municipioSeleccionado, clienteSeleccionado, fechaHasta]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            // Cargar municipios
            const munis = await obtenerMunicipiosCache();
            setMunicipios(munis as Municipio[]);

            // Cargar clientes
            const clis = await obtenerClientesCache('');
            setClientes(clis as Cliente[]);

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
                tipo: 'credito', // Solo créditos
                estado: 'Pendiente,Abonada', // Con saldo pendiente
            };

            const response = await api.get('/cotizaciones', { params });
            const datos = response.data || [];

            setCartera(datos);
            console.log(`✅ ${datos.length} cotizaciones en cartera`);
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
                    c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                    c.cliente_id.toLowerCase().includes(busqueda.toLowerCase()) ||
                    c.numero_cotizacion.toLowerCase().includes(busqueda.toLowerCase())
            );
        }

        // Filtro por cliente específico
        if (clienteSeleccionado) {
            filtrada = filtrada.filter((c) => c.cliente_id === clienteSeleccionado);
        }

        // Filtro por municipio
        if (municipioSeleccionado > 0) {
            const municipioNombre = municipios.find((m) => m.id === municipioSeleccionado)?.nombre;
            if (municipioNombre) {
                filtrada = filtrada.filter((c) => c.municipio === municipioNombre);
            }
        }

        // Filtro por fecha (hasta)
        const fechaLimite = formatearFechaISO(fechaHasta);
        filtrada = filtrada.filter((c) => {
            const fechaCot = c.fecha.split('-').reverse().join('-'); // DD-MM-YYYY → YYYY-MM-DD
            return fechaCot <= fechaLimite;
        });

        setCarteraFiltrada(filtrada);
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setClienteSeleccionado('');
        setMunicipioSeleccionado(0);
        setFechaHasta(new Date());
    };

    const seleccionarCliente = (cliente: Cliente) => {
        setClienteSeleccionado(cliente.id);
        setModalClientes(false);
    };

    const seleccionarMunicipio = (municipio: Municipio) => {
        setMunicipioSeleccionado(municipio.id);
        setModalMunicipios(false);
    };

    const cambiarFecha = (event: any, selectedDate?: Date) => {
        setModalFecha(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaHasta(selectedDate);
        }
    };

    const verDetalle = (item: Cartera) => {
        const porcentajePagado = ((item.abonado / item.subtotal) * 100).toFixed(1);

        Alert.alert(
            `📋 ${item.numero_cotizacion}`,
            `
Cliente: ${item.cliente_nombre}
Cédula: ${item.cliente_id}
${item.municipio ? `Municipio: ${item.municipio}` : ''}
Fecha: ${item.fecha}

💰 Total: $${item.subtotal.toLocaleString()}
✅ Abonado: $${item.abonado.toLocaleString()} (${porcentajePagado}%)
⏳ Saldo: $${item.saldo.toLocaleString()}

Estado: ${item.estado}
      `.trim()
        );
    };

    const calcularTotales = () => {
        const totalDeuda = carteraFiltrada.reduce((sum, c) => sum + c.saldo, 0);
        const totalAbonado = carteraFiltrada.reduce((sum, c) => sum + c.abonado, 0);
        const totalGeneral = carteraFiltrada.reduce((sum, c) => sum + c.subtotal, 0);

        return { totalDeuda, totalAbonado, totalGeneral };
    };

    const renderItem = ({ item }: { item: Cartera }) => {
        const porcentajePagado = ((item.abonado / item.subtotal) * 100).toFixed(0);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => verDetalle(item)}
                activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                    <Text style={styles.numero}>{item.numero_cotizacion}</Text>
                    <View
                        style={[
                            styles.badge,
                            item.estado === 'Pendiente' ? styles.badgePendiente : styles.badgeAbonada,
                        ]}>
                        <Text style={styles.badgeText}>{item.estado}</Text>
                    </View>
                </View>

                <Text style={styles.cliente}>{item.cliente_nombre}</Text>
                <Text style={styles.cedula}>CC: {item.cliente_id}</Text>
                {item.municipio && (
                    <Text style={styles.municipio}>📍 {item.municipio}</Text>
                )}
                <Text style={styles.fecha}>{item.fecha}</Text>

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
                        <Text style={styles.montoValue}>${item.subtotal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.montoContainer}>
                        <Text style={styles.montoLabel}>Abonado:</Text>
                        <Text style={[styles.montoValue, styles.montoAbonado]}>
                            ${item.abonado.toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.montoContainer}>
                        <Text style={styles.montoLabel}>Saldo:</Text>
                        <Text style={[styles.montoValue, styles.montoSaldo]}>
                            ${item.saldo.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const totales = calcularTotales();
    const clienteNombre = clienteSeleccionado
        ? clientes.find((c) => c.id === clienteSeleccionado)?.nombre
        : null;
    const municipioNombre = municipioSeleccionado
        ? municipios.find((m) => m.id === municipioSeleccionado)?.nombre
        : null;

    return (
        <View style={styles.container}>
            {/* Filtros */}
            <View style={styles.filtrosContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre, cédula o #cotización..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                    importantForAutofill="no"
                />

                <View style={styles.filtrosRow}>
                    <TouchableOpacity
                        style={styles.filtroButton}
                        onPress={() => setModalClientes(true)}>
                        <Text style={styles.filtroButtonText}>
                            {clienteNombre || '👤 Cliente'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filtroButton}
                        onPress={() => setModalMunicipios(true)}>
                        <Text style={styles.filtroButtonText}>
                            {municipioNombre || '📍 Municipio'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filtroButton}
                        onPress={() => setModalFecha(true)}>
                        <Text style={styles.filtroButtonText}>
                            📅 {formatearFechaCorta(fechaHasta)}
                        </Text>
                    </TouchableOpacity>
                </View>

                {(clienteSeleccionado || municipioSeleccionado > 0 || busqueda) && (
                    <TouchableOpacity style={styles.limpiarButton} onPress={limpiarFiltros}>
                        <Text style={styles.limpiarButtonText}>🗑️ Limpiar filtros</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Resumen de totales */}
            <View style={styles.totalesContainer}>
                <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Total Deuda</Text>
                    <Text style={[styles.totalValue, styles.totalDeuda]}>
                        ${totales.totalDeuda.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Abonado</Text>
                    <Text style={[styles.totalValue, styles.totalAbonado]}>
                        ${totales.totalAbonado.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${totales.totalGeneral.toLocaleString()}</Text>
                </View>
            </View>

            {/* Contador */}
            <View style={styles.summary}>
                <Text style={styles.summaryText}>
                    {carteraFiltrada.length} cotización{carteraFiltrada.length !== 1 ? 'es' : ''} en cartera
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
                        {busqueda || clienteSeleccionado || municipioSeleccionado
                            ? 'No se encontraron resultados con los filtros aplicados'
                            : 'No hay cotizaciones pendientes'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={carteraFiltrada}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}

            {/* Modal Fecha */}
            {modalFecha && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={modalFecha}
                    onRequestClose={() => setModalFecha(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Fecha Hasta</Text>
                                <TouchableOpacity onPress={() => setModalFecha(false)}>
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={fechaHasta}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={cambiarFecha}
                                maximumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerBoton}
                                    onPress={() => setModalFecha(false)}>
                                    <Text style={styles.datePickerBotonTexto}>Aceptar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}

            {/* Modal Clientes */}
            <Modal
                visible={modalClientes}
                animationType="slide"
                onRequestClose={() => setModalClientes(false)}>
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
                        <TouchableOpacity onPress={() => setModalClientes(false)}>
                            <Text style={styles.modalClose}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => {
                            setClienteSeleccionado('');
                            setModalClientes(false);
                        }}>
                        <Text style={[styles.listItemTitle, styles.listItemAll]}>
                            Todos los clientes
                        </Text>
                    </TouchableOpacity>

                    <FlatList
                        data={clientes}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.listItem}
                                onPress={() => seleccionarCliente(item)}>
                                <Text style={styles.listItemTitle}>{item.nombre}</Text>
                                <Text style={styles.listItemSubtitle}>CC: {item.id}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

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
        fontSize: 13,
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
    badgePendiente: {
        backgroundColor: '#ff9800',
    },
    badgeAbonada: {
        backgroundColor: '#2196F3',
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    cliente: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    cedula: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    municipio: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    fecha: {
        fontSize: 13,
        color: '#999',
        marginBottom: 10,
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
    montoAbonado: {
        color: '#4CAF50',
    },
    montoSaldo: {
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
    listItemSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    listItemAll: {
        color: '#004080',
        fontWeight: 'bold',
    },
});