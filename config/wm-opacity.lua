-- One owned rule, shared by startup and live settings. Hyprland uses RE2:
-- exclusions use its negative: prefix, never unsupported lookahead assertions.
return function(wm)
    if _G.cyberarchOpacityRule then
        pcall(function() _G.cyberarchOpacityRule:set_enabled(false) end)
        _G.cyberarchOpacityRule = nil
    end
    local mode = wm.wmOpacityMode or "off"
    if wm.wmOpacity ~= true or (mode ~= "only" and mode ~= "except") then return end
    local apps = {}
    for entry in tostring(wm.wmOpacityApps or ""):gmatch("[^,\n]+") do
        local app = entry:match("^%s*(.-)%s*$")
        if app ~= "" then
            apps[#apps + 1] = app:gsub('([\\%.%+%*%?%[%]%^%$%(%)%{%}%|])', '\\%1')
        end
    end
    if #apps == 0 then return end
    local pattern = "(?i)^(" .. table.concat(apps, "|") .. ")$"
    if mode == "except" then pattern = "negative:" .. pattern end
    local opacity = math.max(0, math.min(1, tonumber(wm.wmOpacityVal) or 1))
    _G.cyberarchOpacityRule = hl.window_rule({
        name = "cyberarch-wm", match = { class = pattern },
        opacity = string.format("%.3f override %.3f override", opacity, math.max(0.5, opacity - 0.08)),
    })
end
