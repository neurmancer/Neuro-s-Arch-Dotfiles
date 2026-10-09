-- Per-window live opacity. Keep state across config reloads, keyed by stable ID.
CD = CD or {}
CD.windowOpacity = CD.windowOpacity or {}

return function(delta)
    return function()
        local window = hl.get_active_window()
        if not window then return end

        local id = window.stable_id
        local current = CD.windowOpacity[id]
        if not current then
            -- The Lua window API does not expose per-window rule opacity.
            current = tonumber(hl.get_config("decoration.active_opacity")) or 1
        end
        local value = math.max(0.10, math.min(1, current + delta))
        value = math.floor(value * 100 + 0.5) / 100
        for _, prop in ipairs({ "opacity", "opacity_inactive", "opacity_fullscreen" }) do
            hl.dispatch(hl.dsp.window.set_prop({
                window = window, prop = prop .. "_override", value = "1",
            }))
            hl.dispatch(hl.dsp.window.set_prop({
                window = window, prop = prop, value = string.format("%.2f", value),
            }))
        end
        CD.windowOpacity[id] = value
    end
end
