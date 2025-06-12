import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function TokenScreen() {
  const router = useRouter();

  useEffect(() => {
    // Po zalogowaniu, przekieruj do welcome screen
    router.replace('/welcome');
  }, [router]);

  return null;
}
