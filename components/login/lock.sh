#!/usr/bin/env bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -eu
export XDG_SESSION_TYPE="${XDG_SESSION_TYPE:-wayland}"
[ "$XDG_SESSION_TYPE" = wayland ] || { echo "qylock requires Wayland" >&2; exit 1; }
lock_root="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
[ -d "$lock_root" ] && [ -O "$lock_root" ] && [ ! -L "$lock_root" ] || exit 1
umask 077
lock_session="${HYPRLAND_INSTANCE_SIGNATURE:-${WAYLAND_DISPLAY:-default}}"
lock_session="${lock_session//[^a-zA-Z0-9_.-]/_}"
exec 9>"$lock_root/qylock-$lock_session.lock"
flock -n 9 || exit 0
command -v quickshell >/dev/null || { echo "quickshell is missing; keeping any existing locker" >&2; exit 1; }
[ -r "$DIR/lock_shell.qml" ] || exit 1
export QT_MEDIA_BACKEND=ffmpeg
QS_USER_THEME=""
theme_file="${XDG_CONFIG_HOME:-$HOME/.config}/qylock/theme"
if [ -r "$theme_file" ]; then read -r QS_USER_THEME < "$theme_file" || true; fi
if [[ "$QS_USER_THEME" =~ ^[a-zA-Z0-9_-]+$ ]] && [ -r "$DIR/themes/$QS_USER_THEME/Main.qml" ]; then
    export QS_THEME="$QS_USER_THEME"
else
    export QS_THEME="netwatch"
fi
export QS_THEME_PATH="$DIR/themes/$QS_THEME"
export QS_PAM_CONFIG="qs-lock"
# Refuse to claim a working locker without its authentication policy.
[ -r /etc/pam.d/qs-lock ] || { echo "Missing /etc/pam.d/qs-lock; run login setup" >&2; exit 1; }
export XCURSOR_THEME="neurodance"
export XCURSOR_SIZE=48

### fix for lock 
if [ -z "${WAYLAND_DISPLAY:-}" ] && command -v wlr-randr >/dev/null 2>&1; then
    for socket in "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"/wayland-[0-9]*; do
        [ -S "$socket" ] || continue
        candidate="${socket##*/}"
        if WAYLAND_DISPLAY="$candidate" wlr-randr >/dev/null 2>&1; then
            export WAYLAND_DISPLAY="$candidate"
            break
        fi
    done
fi

# Never terminate another locker. The compositor arbitrates lock acquisition.

wallpaper_lua="${XDG_CONFIG_HOME:-${HOME}/.config}/cyberarch/wallpaper.lua"
if [ -r "$wallpaper_lua" ]; then
    lock_wallpaper="$(sed -n 's/^[[:space:]]*wallpaper[[:space:]]*=[[:space:]]*"\(.*\)"[[:space:]]*$/\1/p' "$wallpaper_lua" | tail -n 1)"
    if [ -n "${lock_wallpaper:-}" ] && [ -r "$lock_wallpaper" ]; then
        export QS_WALLPAPER="$lock_wallpaper"
    fi
fi

exec quickshell -p "$DIR/lock_shell.qml"
