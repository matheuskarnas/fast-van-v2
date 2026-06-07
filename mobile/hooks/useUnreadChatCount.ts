import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getUnreadChatCount } from "../services/chat";

export function formatUnreadBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : String(count);
}

export function useUnreadChatCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const result = await getUnreadChatCount();
      if (result.success) {
        setCount(result.count ?? 0);
      }
    } catch {
      /* ignore network errors for badge */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const intervalId = setInterval(refresh, 30000);
    return () => clearInterval(intervalId);
  }, [refresh]);

  return { count, badge: formatUnreadBadge(count), refresh };
}
