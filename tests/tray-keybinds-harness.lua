-- Run from the repository root with lua tests/tray-keybinds-harness.lua.

local bindings, counts = {}, {}
local function stub() return setmetatable({}, { __index = function(self, key) local value = stub(); rawset(self, key, value); return value end, __call = function() return function() end end }) end
hl = stub()
hl.bind = function(combo, action) bindings[combo] = action; counts[combo] = (counts[combo] or 0) + 1 end
hl.dsp.exec_cmd = function(command) return command end
hl.define_submap = function() end
local originalDofile = dofile
dofile = function() return function() end end
loadfile = function() return nil end
originalDofile('config/keybinds.lua')
assert(bindings['SUPER + ALT + S']:find('system-tray', 1, true))
assert(bindings['SUPER + ALT + C']:find('controls-tray', 1, true))
assert(bindings['SUPER + ALT + W']:find('information-tray', 1, true))
assert(bindings['SUPER + ALT + H']:find('toggle-widgets', 1, true))
assert(bindings['SUPER + SHIFT + C']:find('modal sys', 1, true))

for _, key in ipairs({'S', 'C', 'W', 'H'}) do assert(counts['SUPER + ALT + ' .. key] == 1, 'Duplicate tray shortcut: ' .. key) end
print('Tray shortcuts and direct system shortcut passed')
