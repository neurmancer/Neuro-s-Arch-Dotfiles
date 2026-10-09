#!/usr/bin/env bash
# Source from session helpers. Never fall back to shared /tmp names.
cyber_runtime() {
    local base="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}" session
    [ -d "$base" ] && [ -O "$base" ] && [ ! -L "$base" ] || return 1
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
