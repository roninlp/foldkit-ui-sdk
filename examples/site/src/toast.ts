import { createToaster } from '@ui-sdk/web'

// The docs' Toast demo fires through this toaster, the same way an app would.
// `Toast.Region` renders whatever it holds, and the "Show a toast" button
// dispatches the Message that runs the toaster from a Command.
export const demoToaster = createToaster({ duration: 5000 })
