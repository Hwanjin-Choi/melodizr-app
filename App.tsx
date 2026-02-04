import "./global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import StudioScreen from "./src/screens/StudioScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <StudioScreen />
    </SafeAreaProvider>
  );
}
