// app/index.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { verificarSesion } from '@/src/config/api';

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Pequeño delay para evitar conflictos
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const sesion = await verificarSesion();
        
        if (sesion.autenticado) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
        router.replace('/(auth)/login');
      } finally {
        setChecking(false);
      }
    }

    if (checking) {
      checkAuth();
    }
  }, [checking]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <ActivityIndicator size="large" color="#004080" />
    </View>
  );
}