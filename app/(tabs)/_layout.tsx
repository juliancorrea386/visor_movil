// app/(tabs)/_layout.tsx
import { logout } from '@/src/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { usePathname, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SubItem = { name: string; label: string };

type MenuItem =
  | { key: string; label: string; icon: string; route: string; children?: never }
  | { key: string; label: string; icon: string; route?: never; children: SubItem[] };

// ─── Estructura del menú ──────────────────────────────────────────────────────

const MENU: MenuItem[] = [
  { key: 'inicio',        label: 'Inicio',        icon: '🏠', route: 'index' },
  {
    key: 'cotizaciones',
    label: 'Cotizaciones',
    icon: '📋',
    children: [
      { name: 'nueva-cotizacion', label: 'Nueva Cotización' },
      { name: 'lista',            label: 'Lista de Cotizaciones' },
    ],
  },
  { key: 'clientes',      label: 'Clientes',      icon: '👥', route: 'clientes' },
  { key: 'cartera',       label: 'Cartera',       icon: '💰', route: 'cartera' },
  { key: 'sincronizar',   label: 'Sincronizar',   icon: '🔄', route: 'sincronizar' },
  { key: 'configuracion', label: 'Configuración', icon: '⚙️', route: 'configuracion' },
];

// ─── Item expandible ──────────────────────────────────────────────────────────

function ExpandableItem({
  item,
  pathname,
  onNavigate,
}: {
  item: MenuItem & { children: SubItem[] };
  pathname: string;
  onNavigate: (name: string) => void;
}) {
  const isChildActive = item.children.some((c) => pathname.includes(c.name));
  const [open, setOpen] = useState(isChildActive);
  const anim = useRef(new Animated.Value(isChildActive ? 1 : 0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const maxHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, item.children.length * 50],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <>
      <TouchableOpacity
        style={[styles.item, isChildActive && styles.itemParentActive]}
        onPress={toggle}
        activeOpacity={0.6}>
        <Text style={styles.itemIcon}>{item.icon}</Text>
        <Text style={[styles.itemLabel, isChildActive && styles.itemLabelActive]}>
          {item.label}
        </Text>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate }] }]}>
          ›
        </Animated.Text>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight, overflow: 'hidden' }}>
        {item.children.map((child) => {
          const active = pathname.includes(child.name);
          return (
            <TouchableOpacity
              key={child.name}
              style={[styles.subItem, active && styles.subItemActive]}
              onPress={() => onNavigate(child.name)}
              activeOpacity={0.6}>
              <View style={styles.subDot}>
                <View style={[styles.dot, active && styles.dotActive]} />
              </View>
              <Text style={[styles.subLabel, active && styles.subLabelActive]}>
                {child.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </>
  );
}

// ─── Contenido del Drawer ─────────────────────────────────────────────────────

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState({ nombre: 'Usuario' });

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

  const isRouteActive = (route: string) => {
    if (route === 'index') return pathname === '/(tabs)' || pathname === '/';
    return pathname.includes(route);
  };

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.appName}>Cotizaciones Móvil</Text>
        <Text style={styles.userName}>{usuario.nombre}</Text>
      </View>

      {/* Menú */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {MENU.map((item) => {
          if (item.children) {
            return (
              <ExpandableItem
                key={item.key}
                item={item as MenuItem & { children: SubItem[] }}
                pathname={pathname}
                onNavigate={navigateTo}
              />
            );
          }

          const active = isRouteActive(item.route!);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => navigateTo(item.route!)}
              activeOpacity={0.6}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
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

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#004080' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
        drawerStyle: { width: 270 },
        swipeEnabled: false,
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  header:           { backgroundColor: '#004080', paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20 },
  appName:          { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  userName:         { fontSize: 17, fontWeight: '600', color: '#fff' },
  list:             { flex: 1, paddingTop: 8 },

  // Items directos
  item:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  itemActive:       { backgroundColor: '#EEF3FB', borderLeftWidth: 3, borderLeftColor: '#004080', paddingLeft: 17 },
  itemParentActive: { backgroundColor: '#F5F8FF' },
  itemIcon:         { fontSize: 19, width: 26, textAlign: 'center' },
  itemLabel:        { flex: 1, fontSize: 15, color: '#333' },
  itemLabelActive:  { color: '#004080', fontWeight: '600' },
  chevron:          { fontSize: 22, color: '#bbb', lineHeight: 24 },

  // Sub-items
  subItem:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingLeft: 60, paddingRight: 20, gap: 10 },
  subItemActive:    { backgroundColor: '#EEF3FB', borderLeftWidth: 3, borderLeftColor: '#004080', paddingLeft: 57 },
  subDot:           { width: 20, alignItems: 'center' },
  dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  dotActive:        { backgroundColor: '#004080' },
  subLabel:         { fontSize: 14, color: '#666' },
  subLabelActive:   { color: '#004080', fontWeight: '600' },

  // Footer
  footer:           { paddingBottom: 30 },
  footerDivider:    { height: 1, backgroundColor: '#eee', marginBottom: 4 },
  logoutItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  logoutLabel:      { fontSize: 15, color: '#c0392b' },
});
