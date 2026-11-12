import type { Component } from 'vue'

export interface UiMenuItem {
  label: string
  icon?: Component
  danger?: boolean
  action: () => void
}
