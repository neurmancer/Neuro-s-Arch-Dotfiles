# Neuro's Arch Dotfiles
> _Version: β_

> Lowkey I wanna call it _NeurOS_ OwO


### **A Hyprland *netrunner* rice with built on AGS v3 / Astal**


## Table of Contents

- [HERE](#table-of-contents)
- [Original Author](#support-the-original-author)
- [**Check before going further**](#note)
- [Shit todo](#shit-to-do-list)

### Note 

- If the sections down below is explaining something kindly it is the original dev and if some feral goblin cussing and telling you why that's gonna be perfect... that's probably me...

> I didn't touch most of the readme yet because I did not touch the code and removing the original version before fucking with files feels wrong UnU

> Fuck...this gonna require soooo much documentation afterwards...


### Shit to-do list

- [ ] Changing some sound effect

- [ ] UI tweaks

- [X] Optional NSD™ color themes

- [ ] unskippable scope-creeep driven development

- [ ] Fish is cool but I might return to bash as the default shell

- [X] Cool retro-term support won't be here kitty is the default shell (**Removed the other terminal supports**)

- [ ] There is a 'cyberspace' online terminal webkit GUI here but I haven't investigate it yet and wasn't working...so might ditch it as well

- [ ] A scratchpad 


### About each component

> Those are the original versions that I'll keeop 'till I fuck with them

- **Corner widgets** -> Renders the same UI style of the game UI shortcuts like Radio, Vehicle, Phone, Cyberware item etc
  -  Radio shortcut as Music Player (Toggleable by clicking, or SUPER + SHIFT + O)
  -  System controls for rest of shortcuts like Brightness, Volume, Microphone, Wifi, Bluetooth, Record Screen
  - App tray/Notification center recreated on V's contacts HUD.
    -> the MESSAGES will show the last notifications and their respective apps
    -> the APPS Tray is shows the tray for active apps along with custom tilted context menus

    
- **Weather / markets tray** -> A right-center tray containing the compact forecast and market feed.
  - Hover over the edge strip to reveal its tab; click it or use `SUPER + ALT + W` to open or close the widgets.
  - Weather shows the saved city's current conditions and seven-day forecast. Click to open the full forecast; right-click to change the city. The clock/date remains with weather; right-click the clock to open time settings.
  - Markets retain stocks, crypto, news and sparklines. Double-click to open the full market view.
  - The map and dedicated network-status/speed indicator have been removed. Wi-Fi controls remain in the controls tray.
    
- **Weapon/Item** -> The bottom-right hud that shows weapon/ammo in-game
  -  Shows App Launcher, with a custom icon gathered from the design concepts of Cyberpunk 2077
  -  App Launcher shows a custom launcher that mimicks the Kiroshi Scanner, with audio and animations and the same shape of the 'quickhacks' frames.

- **Pacman hook** -> Displays V's streetcred reputation frame
  - Whenever a new pacman pkg is added, it will show animated frame as "PKG Installed\nVersion XXX" 
  - Whenever AUR packages have upgrades available, it will show update notifications.

  
- **Screen Recording** -> Starts recording the active screen, and with the same HUD components from in-game when acessing cameras from quickhacks (Toggleable by SUPER+SHIFT+R)

- **Music player** -> Opens/Closes the Media Player, designed pixel-perfect exact as the RADIOPORT in the game. (Toggleable by SUPER+SHIFT+O)
  
- **Quickshell lockscreen** -> ANimated loginscreen with qs.
 
- **Terminal** -> Kitty, with colors that follow the desktop palette and an optional fish shell with a SAMURAI banner.

---


## Requirements

- **Arch Linux or AUR based distros.**
- **Hyprland ≥ 0.56**
- An **AUR helper**: `yay` or `paru` (Always check PKGBUILD btw)
- A running Hyprland session (so theming + first-run setup can apply)

---

## Install

```bash
git clone https://github.com/neurmancer/Neuro-s-Arch-Dotfiles.git
cd Neuro-s-Arch-Dotfiles
chmod +x install.sh
./install.sh
```

---

## Updating

```bash
cd ~/.config/hypr/themes/cyberpunk
./updater.sh
```

The HUD checks for a new release a few seconds after boot and offers the update itself: a
`NEW VERSION VX.Y.Z AVAILABLE` banner slides in with **`SUPER + SHIFT + Q`** to open the changelog and
`J` to dismiss it until the next login. The modal lists what changed and its `UPDATE NOW` button runs the
same `updater.sh` in a terminal so you can watch the whole flow.

`updater.sh` requires a clean checkout and a successful release lookup. It builds
the release in a temporary worktree before fast-forwarding, waits for HUD readiness,
and restores the previous commit if activation fails. Releases that change the
installer or dependencies require a separate installation or package upgrade.
Local edits are never automatically stashed.

If the HUD fails, open a terminal with the compositor keybind or switch to a TTY
and inspect `~/.local/state/cyberarch/shell.log`. Run
`~/.config/hypr/themes/cyberpunk/scripts/restart` from the graphical session after
repairing the error. Startup retries are bounded; restart prebuilds the replacement
and retains the last healthy bundle for recovery.

Release status and remaining desktop validation: [reliability audit](RELIABILITY_AUDIT.md).

---

## Keybinds

The theme modifier is **`$themeMod = SUPER + SHIFT`**. You can change it on Theme Settings > Keybinds (or change it at the top of `config/keybinds.lua`). 
Open the full cheat-sheet with all keybinds anytime with **`SUPER+SHIFT+H`**.

### HUD & widgets

The bottom-left **CONTROLS** tab peeks out from the screen edge when idle.
Hover to reveal the full tab; click it or press **SUPER + ALT + C** to open or
close volume, brightness, music, recording, Wi-Fi, Bluetooth, and power controls.
Hover alone never opens the widgets. An opened tray stays open when the pointer
leaves; after closing it, the tab retracts when the pointer moves away. Sliding
follows the modal animation setting. The shortcut targets the monitor under the
pointer and can be changed in Theme Settings > Keybinds. Trays start collapsed
after a shell restart. Individual utility shortcuts work even while the tray is
closed; messages remain available through **SUPER + SHIFT + M**. The global
widget visibility and recording rules also apply to the tray and its tab.

The right-center **WEATHER / MARKETS** tray opens leftward from a vertical edge
tab and follows the same peek, hover and click behavior, with **SUPER + ALT + W**
as its configurable shortcut. Click weather to
expand its forecast or double-click markets for the full market view. The direct
**SUPER + SHIFT + W** and **SUPER + SHIFT + G** shortcuts work even before the
tray has been opened. Weather and market background refreshes pause when both
their compact widgets and expanded views are hidden.

| Keybind | Action |
| --- | --- |
| `SUPER + ALT + C` | Toggle controls tray |
| `SUPER + ALT + W` | Toggle weather / markets tray |
| `SUPER` / `SUPER + Space` | App launcher |
| `SUPER + SHIFT + Z` | Toggle HUD above / below windows |
| `SUPER + ALT + H` | Hide / show all desktop widgets together (saved across restarts) |
| `SUPER + SHIFT + V` | Volume & Microphone modal |
| `SUPER + SHIFT + I` | Brightness modal |
| `SUPER + SHIFT + M` | Messages modal |
| `SUPER + SHIFT + O` | Music player |
| `SUPER + SHIFT + N` | Wi-Fi modal |
| `SUPER + SHIFT + G` | Netterminal: See Stocks, Crypto or News |
| `SUPER + SHIFT + X` | Dismiss Notifications |
| `SUPER + SHIFT + U` | System Upgrade modal |
| `SUPER + SHIFT + Q` | CyberArch update: version + changelog |
| `SUPER + SHIFT + B` | Bluetooth modal |
| `SUPER + SHIFT + P` | Power menu |
| `SUPER + SHIFT + W` | 7-day weather forecast (double-click the city to change location) |
| `SUPER + SHIFT + -` | System time: timezone, NTP sync, manual set |
| `SUPER + SHIFT + Y` | Battery modal |
| `SUPER + SHIFT + C` | CPU / RAM / system modal |
| `SUPER + SHIFT + H` | Keybind help |
| `SUPER + SHIFT + BACKSPACE` | Theme Settings |

## New shit drop

| `SUPER + ALT + P` | Next color palette |
| `SUPER + ALT + SHIFT + P` | Previous color palette |

---

Kitty follows the selected palette through `~/.config/kitty/cyberarch-colors.conf`
(or your `KITTY_CONFIG_DIRECTORY`). The generated include changes colors only; fonts,
padding, opacity, and keybindings stay in `kitty.conf`. Open Kitty windows reload
automatically using [Kitty’s configuration reload signal](https://sw.kovidgoyal.net/kitty/conf/).

### System & capture

| Keybind | Action |
| --- | --- |
| `SUPER + T` or `SUPER + SHIFT + T` | Kitty terminal |
| `SUPER + SHIFT + S` | Screenshot (region) |
| `SUPER + SHIFT + R` | Start / stop screen recording |
| `SUPER + SHIFT + L` | Lock screen |
| `SUPER + D` | Peek desktop (hide windows) |

### Window management

| Keybind | Action |
| --- | --- |
| `SUPER + SHIFT + F` | Fullscreen toggle |
| `SUPER + F` | Float / tile toggle |
| `SUPER + ALT + Page Up` | Increase focused-window opacity by %5 |
| `SUPER + ALT + Page Down` | Decrease focused-window opacity by %5 |
| `SUPER + ← → ↑ ↓` | Move focus |
| `SUPER + SHIFT + ← → ↑ ↓` | Move window |
| `CTRL + SHIFT + ← → ↑ ↓` | Resize window |
| `SUPER + 1…0` | Switch workspace (with the glitch transition) |
| `ALT + SHIFT + 1/2/3/4/5...` | Send window to workspace |
| 3-finger swipe (If using notebook)  ← / → | Previous / next workspace |

Opacity changes apply immediately to the focused window, including its inactive
and fullscreen states, within a **10%–100%** range(I mean...duh). They last for that window's
lifetime reopening the application uses its configured defaults. 
You don't need restart

These opacity and palette shortcuts use fixed `SUPER + ALT` modifiers ('cuz I am not fucking .ts developer ), independent
of `$themeMod`. To customize them, open **Theme Settings > Keybinds**; their defaults
are defined in [`config/keybinds.lua`](config/keybinds.lua).

---

## Layout

```
cyberpunk/
├─ core.ts              # HUD entry point (AGS / astal / GJS)
├─ env.ts              # Environment and runtime helpers
├─ theme.lua            # Hyprland full theme
├─ install.sh
├─ package.json
├─ tsconfig.json
├─ config/
│  ├─ city.json                 #  Saved location (starts by default in London,UK)
│  └─ keybinds.ts            # Keybinds for theme
│
├─ components/
│  ├─ modules/          # The widgets and main components of the theme HD
│  ├─ login/            # Quickshell login
│  ├─ style/            # cyber.scss and cyber.css
│  └─ glitch.frag
│
├─ scripts/             # launcher, screenshot, screenrecord, ws, terminal, and other used scripts.
├─ assets/               # fonts, cursor, icons, kitty, kvantum, hyprbars, and resources
└─ preview/
```

---
## Credits

- Built on **[Hyprland](https://hypr.land)**, **[AGS / Aylur's GTK Shell](https://github.com/Aylur/ags)**, and **[astal](https://github.com/Aylur/astal)**.
- Lockscreen on **[quickshell](https://quickshell.org)**.
- Terminal: **[Kitty](https://sw.kovidgoyal.net/kitty/)**.
- The custom titlebars are a small cairo-bevel patch over Hyprland's **hyprbars** plugin, from original hyprbars by the Hyprland project.
- Projekt Red obviously for the game Cyberpunk 2077 UI Designs and aesthetics.
 
<div align="center">

## Support the Original Author

[![Star on GitHub](https://img.shields.io/github/stars/ARCANGEL0/CyberArch-DotFiles?style=social)](https://github.com/ARCANGEL0/CyberArch-dotfiles)
[![Follow on GitHub](https://img.shields.io/github/followers/ARCANGEL0?style=social)](https://github.com/ARCANGEL0)
<br>

<a href='https://ko-fi.com/J3J7WTYV7' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
<br>
<strong>Hack the world. Byte by Byte.</strong> ⛛ <br>
𝝺𝗿𝗰𝗮𝗻𝗴𝗲𝗹𝗼 @ 2026

</div>
