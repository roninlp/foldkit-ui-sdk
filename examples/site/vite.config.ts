import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

// @foldkit/vite-plugin stamps view-function identity onto the built modules,
// so the differ replaces a subtree whose producing view function changed —
// a route change tears the old page down and builds the new one — instead of
// patching across the branch. The routing docs say not to build a Foldkit app
// without it; it also preserves the Model across dev-server reloads.
export default defineConfig({
  plugins: [foldkit()],
})
