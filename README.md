# Neuro's Arch Dotfiles

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



### Shit to-do list

- [ ] Changing some sound effect

- [ ] UI tweaks

- [ ] Optional NSD™ color themes

- [ ] unskippable scope-creeep driven development

- [ ] Fish is cool but I might return to bash as the default shell

- [ ] Cool retro-term support won't be here kitty is the default shell

- [ ] There is a 'cyberspace' online terminal webkit GUI here but I haven't investigate it yet and wasn't working...so might ditch it as well

### About each component

> Those are the original versions that I'll keeop 'till I fuck with them

- **Health bars** -> The in-game UI bars meant for Health, Stamina, RAM and Level are copied to provide system monitors:
  - The level badge shows the current active workspace, like [1], [2] and etc.
  -  The Health bars provide average usage in % of CPU load using /proc/stat
  -  The RAM bars...well they provide RAM Memory usage, with ramStat()
  -  the top bar on health for experience, provides the current filesystem storage as `Used/Total` 
  -  The Stamina bar provides the current battery level (if AC, will just stay at 100%)

- **Corner widgets** -> Renders the same UI style of the game UI shortcuts like Radio, Vehicle, Phone, Cyberware item etc
  -  Radio shortcut as Music Player (Toggleable by clicking, or SUPER + SHIFT + O)
  -  System controls for rest of shortcuts like Brightness, Volume, Microphone, Wifi, Bluetooth, Record Screen
  - App tray/Notification center recreated on V's contacts HUD.
    -> the MESSAGES will show the last notifications and their respective apps
    -> the APPS Tray is shows the tray for active apps along with custom tilted context menus

    
- **Minimap** -> Recreates the Minimap from the HUD exactly the same as in-game, showing a random location from `city.json`  
  -  Weather widget below minimap: retrieves the weather forecast for the next 7 days from location at `city.json` using Open Meteo API (Right click to change city location, and double click to see the full forecast)
  -  Network notification: Displays current WiFi/Etherned connected and SSID, or Offline Status along with Upload/Download speed
  -  Market Feed: Shows an interactive widget that displays values and charts for Stocks, Cryptocoins and Trending news. Double-clicking it opens the ''terminal'' that mimicks V computer where you can access websites and buy cars etc, but for market and news.
    
- **Weapon/Item** -> The bottom-right hud that shows weapon/ammo in-game
  -  Shows App Launcher, with a custom icon gathered from the design concepts of Cyberpunk 2077
  -  App Launcher shows a custom launcher that mimicks the Kiroshi Scanner, with audio and animations and the same shape of the 'quickhacks' frames.

- **Pacman hook** -> Displays V's streetcred reputation frame
  - Whenever a new pacman pkg is added, it will show animated frame as "PKG Installed\nVersion XXX" 
  - Whenever AUR packages have upgrades available, it will show update notifications.

- **KILL MODE** -> Starts an animated overlay similar to Kiroshi aswell, click on any app to forcekill it (Toggleable by SUPER+SHIFT+K)
  
- **Screen Recording** -> Starts recording the active screen, and with the same HUD components from in-game when acessing cameras from quickhacks (Toggleable by SUPER+SHIFT+R)

- **Music player** -> Opens/Closes the Media Player, designed pixel-perfect exact as the RADIOPORT in the game. (Toggleable by SUPER+SHIFT+O)
  
- **Quickshell lockscreen** -> ANimated loginscreen with qs.
 
- **Terminal** -> Installs Cool-Retro-Term by Swordfish90 with a red 'Netrunner' profile, in same style of the terminal windows in-game, and the theme default terminal (Rio GPU Terminal) with _custom frames/colors/layouts_ for each theme applied on CyberArch, each theme loads a different .toml theme configuration. Along with an optional fish installation and 'SAMURAI' banner.

---


## Requirements

- **Arch Linux or AUR based distros.**
- **Hyprland ≥ 0.56**
- An **AUR helper**: `yay` or `paru` (Always check PKGBUILD btw)
- A running Hyprland session (so theming + first-run setup can apply)

---

## Install

```bash
git clone https://github.com/ARCANGEL0/CyberArch-Shell.git #for original 
cd CyberArch-Shell 
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

`updater.sh` fast-forwards your clone to the latest release tag. Local edits are stashed first (with the
stash ref printed) and untracked files are left alone; if `install.sh` changed in the release it asks
before re-running it, then restarts the HUD.

---

## Keybinds

The theme modifier is **`$themeMod = SUPER + SHIFT`**. You can change it on Theme Settings > Keybinds (or change it at the top of `config/keybinds.lua`). 
Open the full cheat-sheet with all keybinds anytime with **`SUPER+SHIFT+H`**.

### HUD & widgets

| Keybind | Action |
| --- | --- |
| `SUPER` / `SUPER + Space` | App launcher |
| `SUPER + SHIFT + Z` | Toggle HUD above / below windows |
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

### System & capture

| Keybind | Action |
| --- | --- |
| `SUPER + SHIFT + T` | Default terminal (Rio) |
| `SUPER + SHIFT + T` | Netrunner terminal (cool-retro-term) |
| `SUPER + SHIFT + S` | Screenshot (region) |
| `SUPER + SHIFT + R` | Start / stop screen recording |
| `SUPER + SHIFT + K` | **Kill mode** (click a window to kill · `ESC` exits) |
| `SUPER + SHIFT + L` | Lock screen |
| `SUPER + D` | Peek desktop (hide windows) |

### Window management

| Keybind | Action |
| --- | --- |
| `SUPER + SHIFT + F` | Fullscreen toggle |
| `SUPER + F` | Float / tile toggle |
| `SUPER + ← → ↑ ↓` | Move focus |
| `SUPER + SHIFT + ← → ↑ ↓` | Move window |
| `CTRL + SHIFT + ← → ↑ ↓` | Resize window |
| `SUPER + 1…0` | Switch workspace (with the glitch transition) |
| `ALT + SHIFT + 1/2/3/4/5...` | Send window to workspace |
| 3-finger swipe (If using notebook)  ← / → | Previous / next workspace |

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
├─ scripts/             # launcher, screenshot, screenrecord, overkill, ws, terminal, and other used scripts.             
├─ assets/               # fonts, cursor, icons, kitty, kvantum, hyprbars, and resources
└─ preview/
```

---
## Credits

- Built on **[Hyprland](https://hypr.land)**, **[AGS / Aylur's GTK Shell](https://github.com/Aylur/ags)**, and **[astal](https://github.com/Aylur/astal)**.
- Lockscreen on **[quickshell](https://quickshell.org)**.
- Terminal: **[cool-retro-term](https://github.com/Swordfish90/cool-retro-term)**.
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

