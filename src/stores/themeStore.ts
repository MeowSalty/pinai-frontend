import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";

type ThemeMode = "system" | "light" | "dark";

const THEME_MODE_KEY = "theme-mode";
const THEME_ORDER: ThemeMode[] = ["system", "light", "dark"];

const isThemeMode = (value: string | null): value is ThemeMode => {
  return value === "system" || value === "light" || value === "dark";
};

const getInitialMode = (): ThemeMode => {
  const savedMode = localStorage.getItem(THEME_MODE_KEY);
  return isThemeMode(savedMode) ? savedMode : "system";
};

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(getInitialMode());
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const systemIsDark = ref(mediaQuery.matches);

  mediaQuery.addEventListener("change", (event) => {
    systemIsDark.value = event.matches;
  });

  const isDark = computed(() => {
    if (mode.value === "system") return systemIsDark.value;
    return mode.value === "dark";
  });

  const toggle = () => {
    const currentIndex = THEME_ORDER.indexOf(mode.value);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_ORDER.length : 0;
    mode.value = THEME_ORDER[nextIndex];
    localStorage.setItem(THEME_MODE_KEY, mode.value);
  };

  return { isDark, mode: readonly(mode), toggle };
});
