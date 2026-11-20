import { Runtime } from 'foldkit'

// Creating the agent first, in its own module, so it is listening before the
// first render. `main.ts` imports this for the demo page.
import './bridge'

import '@phosphor-icons/web/regular'
import '@phosphor-icons/web/fill'
import '@phosphor-icons/web/bold'

// UI SDK's stylesheet and the site chrome first. `main` brings the sink tile
// stylesheets, which must come after UI SDK's layer to win their ties.
import './ui-sdk-web.css'
import './styles.css'
import './sink/fonts.css'
import './sink/bento.css'

import { Message, Model, init, update, view } from './main'
import { installClassBridge } from './sink/class-bridge'
import './sink/compat.css'

// Before the runtime: the copied reference CSS needs the class bridge for
// display:contents parts.
installClassBridge()

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)
