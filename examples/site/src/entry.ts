import { Runtime } from 'foldkit'

// Creating the agent first, in its own module, so it is listening before the
// first render. `main.ts` imports this for the demo page.
import './bridge'

import { Message, Model, init, update, view } from './main'

import './ui-sdk-web.css'
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)
