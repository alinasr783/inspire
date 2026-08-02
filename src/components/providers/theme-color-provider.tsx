"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { applyThemeColor } from "@/lib/theme-colors";

type ThemeColorContextValue = {
  color: string | null;
  setColor: (color: string) => void;
};

const ThemeColorContext = createContext<ThemeColorContextValue>({
  color: null,
  setColor: () => {},
});

export function useThemeColor() {
  return useContext(ThemeColorContext);
}

export function ThemeColorProvider({
  children,
  initialColor,
}: {
  children: React.ReactNode;
  initialColor: string | null;
}) {
  const [color, setColorState] = useState<string | null>(initialColor);

  useEffect(() => {
    if (color) {
      applyThemeColor(color);
    }
  }, [color]);

  const setColor = useCallback((newColor: string) => {
    setColorState(newColor);
    applyThemeColor(newColor);
  }, []);

  return (
    <ThemeColorContext.Provider value={{ color, setColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}
