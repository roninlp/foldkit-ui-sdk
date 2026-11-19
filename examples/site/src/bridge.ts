// The agent bridge, created before the page renders so it hears components as
// they are made. `foldkit-ui-sdk/agent` re-exports UI SDK's framework-agnostic
// bridge unchanged; the Foldkit-rendered ui-* elements look to it exactly like
// UI SDK elements in any other framework.
import { createAgent } from 'foldkit-ui-sdk/agent'

export const agent = createAgent()
