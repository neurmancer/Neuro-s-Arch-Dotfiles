#!/usr/bin/env bash
# Source from session helpers. Never fall back to shared /tmp names.
cyber_runtime() {
    local base="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" session
    [ -d "$base" ] && [ -O "$base" ] && [ ! -L "$base" ] || return 1
    # Activation services can retain an earlier compositor's environment.
    # Resolve only an unambiguous instance for this Wayland display.
    local instances resolved
    if [ -n "${WAYLAND_DISPLAY:-}" ] && command -v hyprctl >/dev/null && command -v python3 >/dev/null; then
        instances="$(timeout 2 hyprctl instances -j 2>/dev/null || true)"
        resolved="$(printf '%s' "$instances" | python3 -c '
import json, os, sys
try:
    instances = json.load(sys.stdin)
    matches = [i["instance"] for i in instances if i.get("wl_socket") == os.environ.get("WAYLAND_DISPLAY")]
    current = os.environ.get("HYPRLAND_INSTANCE_SIGNATURE")
    if current in matches: print(current)
    elif len(matches) == 1: print(matches[0])
except (ValueError, TypeError, KeyError):
    pass
' 2>/dev/null || true)"
        [ -z "$resolved" ] || export HYPRLAND_INSTANCE_SIGNATURE="$resolved"
    fi
    session="${HYPRLAND_INSTANCE_SIGNATURE:-${WAYLAND_DISPLAY:-default}}"
    session="${session//[^a-zA-Z0-9_.-]/_}"
    umask 077
    CYBER_RUNTIME="$base/cyberarch-$session"
    [ ! -L "$CYBER_RUNTIME" ] || return 1
    mkdir -p -m 700 "$CYBER_RUNTIME" || return 1
    [ -O "$CYBER_RUNTIME" ] || return 1
    chmod 700 "$CYBER_RUNTIME" || return 1
    export CYBER_RUNTIME
}
cyber_runtime || { echo 'Cannot create private session runtime directory' >&2; exit 1; }
