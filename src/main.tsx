import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/hero.css'
import './styles/cinema.css'
import './styles/intro.css'
import './styles/adaptive.css'
import './styles/navigation.css'
import './styles/whiteboard.css'
import './styles/resources.css'
import './styles/molecule.css'
import './styles/hero-highlights.css'
import { App } from './app/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
