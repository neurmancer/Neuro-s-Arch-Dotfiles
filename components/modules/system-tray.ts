import { createUtilTray } from "./util-tray.ts"
import { SystemPanel } from "./system-panel.ts"

const system = createUtilTray({
    label: "CPU / RAM",
    edge: "top",
    width: 220,
    code: "03",
    caption: "HOST / TELEMETRY",
    content: SystemPanel,
})
export const SystemTray = system.create
export const toggleSystemTray = system.toggle
