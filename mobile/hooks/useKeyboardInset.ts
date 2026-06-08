import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardInset(bottomOffset = 0) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setInset(Math.max(0, event.endCoordinates.height - bottomOffset));
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bottomOffset]);

  return inset;
}
