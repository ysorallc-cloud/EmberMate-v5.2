import { Redirect, useLocalSearchParams } from 'expo-router';

export default function QuickLogRedirect() {
  const { expand } = useLocalSearchParams<{ expand?: string }>();
  const target = expand
    ? `/(tabs)/log?expand=${expand}`
    : '/(tabs)/log';
  return <Redirect href={target} />;
}
