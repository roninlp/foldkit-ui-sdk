import { Runtime } from 'foldkit'

import { Message, Model, init, update, view } from './main'

// UI SDK's own stylesheet, vendored from @ui-sdk/web's browser build: every
// component part, in light and dark. Page chrome is in styles.css.
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
