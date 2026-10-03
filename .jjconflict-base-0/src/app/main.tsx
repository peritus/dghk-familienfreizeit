import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { buildRevision, compatibilityRevision } from '../config/build.js'
import { activeProfilePresentation } from '../config/index.js'
import './globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Application root is missing')
createRoot(root).render(
  <StrictMode>
    <App profile={activeProfilePresentation} />
  </StrictMode>,
)

// Make the bundle identity observable to the organiser runtime without a second source of truth.
void buildRevision
void compatibilityRevision
