import { useDeviceStore } from '../src/stores/deviceStore';
import PairingScreen from '../src/screens/PairingScreen';
import HomeScreen from '../src/screens/HomeScreen';

export default function Index() {
  const { isPaired } = useDeviceStore();
  return isPaired ? <HomeScreen /> : <PairingScreen />;
}
