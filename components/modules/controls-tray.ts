import { Box } from "./widget.ts"
import { Toggles, HorizDock } from "./dock.ts"
import { createUtilTray } from "./util-tray.ts"

const controls = createUtilTray({
    label: "CONTROLS",
    content: mon => Box({ vertical: true, children: [Toggles(mon, false), HorizDock(mon)] }),
})
export const ControlsTray = controls.create
export const toggleControlsTray = controls.toggle
