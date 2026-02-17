// app/(tabs)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { logout } from '@/src/config/api';

type MenuItem = {
  name: string;
  label: string;
  icon: string;
};

const MENU_ITEMS: MenuItem[] = [
  { name: 'index',            label: 'Inicio',           icon: '🏠' },
  { name: 'nueva-cotizacion', label: 'Nueva Cotización', icon: '➕' },
  { name: 'lista',            label: 'Cotizaciones',     icon: '📋' },
  { name: 'clientes',         label: 'Clientes',         icon: '👥' },
  { name: 'cartera',          label: 'Cartera',          icon: '💰' },
  { name: 'sincronizar',      label: 'Sincronizar',      icon: '🔄' },
  { name: 'configuracion',    label: 'Configuración',    icon: '⚙️' },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState({ nombre: 'Usuario', username: '' });

  useEffect(() => {
    AsyncStorage.getItem('usuario').then((val) => {
      if (val) setUsuario(JSON.parse(val));
    });
  }, []);

  const handleLogout = async () => {
    props.navigation.closeDrawer();
    await logout();
    router.replace('/(auth)/login');
  };

  const navigateTo = (name: string) => {
    props.navigation.closeDrawer();
    if (name === 'index') {
      router.push('/(tabs)');
    } else {
      router.push(`/(tabs)/${name}` as any);
    }
  };

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/(tabs)' || pathname === '/';
    return pathname.includes(name);
  };

  return (
    <View style={styles.container}>
      {/* Cabecera simple */}
      <View style={styles.header}>
        <Text style={styles.appName}>Cotizaciones Móvil</Text>
        <Text style={styles.userName}>{usuario.nombre}</Text>
      </View>

      {/* Lista de items */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => {
          const active = isActive(item.name);
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => navigateTo(item.name)}
              activeOpacity={0.6}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Cerrar sesión al fondo */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.6}>
          <Text style={styles.itemIcon}>🚪</Text>
          <Text style={styles.logoutLabel}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#004080' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
        drawerStyle: { width: 260 },
        swipeEnabled: false, // solo botón hamburguesa
      }}>
      <Drawer.Screen name="index"             options={{ headerTitle: 'Inicio' }} />
      <Drawer.Screen name="nueva-cotizacion"  options={{ headerTitle: 'Nueva Cotización' }} />
      <Drawer.Screen name="lista"             options={{ headerTitle: 'Cotizaciones' }} />
      <Drawer.Screen name="clientes"          options={{ headerTitle: 'Clientes' }} />
      <Drawer.Screen name="cartera"           options={{ headerTitle: 'Cartera' }} />
      <Drawer.Screen name="sincronizar"       options={{ headerTitle: 'Sincronización' }} />
      <Drawer.Screen name="configuracion"     options={{ headerTitle: 'Configuración' }} />
      <Drawer.Screen name="explore"           options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="editar-cotizacion" options={{ drawerItemStyle: { display: 'none' }, headerTitle: 'Editar Cotización' }} />
      <Drawer.Screen name="impresora"         options={{ drawerItemStyle: { display: 'none' }, headerTitle: 'Impresora' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#004080',
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  itemActive: {
    backgroundColor: '#EEF3FB',
    borderLeftWidth: 3,
    borderLeftColor: '#004080',
    paddingLeft: 17,
  },
  itemIcon: {
    fontSize: 19,
    width: 26,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 15,
    color: '#333',
  },
  itemLabelActive: {
    color: '#004080',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 30,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 4,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  logoutLabel: {
    fontSize: 15,
    color: '#c0392b',
  },
});
