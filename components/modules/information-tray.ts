import { Box } from "./widget.ts"
import { WeatherPanel } from "./weather.ts"
import { MarketsPanel } from "./markets.ts"
import { createUtilTray } from "./util-tray.ts"
import { NEON, onColorChange, rgbToHex } from "./colors.ts"

const information = createUtilTray({
    label: "WEATHER / MARKETS",
    side: "right",
    width: 230,
    content: mon => {
        const panel = Box({ vertical: true, children: [WeatherPanel(mon), MarketsPanel(mon)] })
        // A filled surface keeps the entire compact forecast/feed clickable,
        // including the spaces between text, under the HUD's shaped input region.
        const restyle = () => {
            panel.css = `background-color: ${rgbToHex(NEON.modalbg)};`
        }
        restyle()
        const unsubscribe = onColorChange(restyle)
        panel.connect("destroy", unsubscribe)
        return panel
    },
})
export const InformationTray = information.create
export const toggleInformationTray = information.toggle
