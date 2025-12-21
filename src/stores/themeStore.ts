import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  const toggle = () => {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
})
