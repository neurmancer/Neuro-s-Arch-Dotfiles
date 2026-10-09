#!/usr/bin/env bash
# Sourced by install.sh. Keep rollback armed until login activation succeeds.
LOGIN_BACKUP=""
LOGIN_ACTIVE=0
LOGIN_DM_CHANGED=0
LOGIN_PATHS=()
LOGIN_ENABLED=()

login_begin() {
  local path target i=0
  LOGIN_BACKUP="$(sudo mktemp -d /tmp/cyber-login-backup.XXXXXX)" || return 1
  LOGIN_PATHS=("$@")
  # Save symlink targets too: tee/cp may write through existing configuration links.
  for path in "$@"; do
    if [ "$path" != "${LOGIN_DM_LINK:-}" ] && sudo test -L "$path"; then
      target="$(sudo readlink -f "$path")" || { sudo rm -rf -- "$LOGIN_BACKUP"; return 1; }
      LOGIN_PATHS+=("$target")
    fi
  done
  for path in "${LOGIN_PATHS[@]}"; do
    if sudo test -e "$path" || sudo test -L "$path"; then
      sudo cp -a -- "$path" "$LOGIN_BACKUP/$i" || { sudo rm -rf -- "$LOGIN_BACKUP"; return 1; }
    fi
    i=$((i + 1))
  done
  mapfile -t LOGIN_ENABLED < <(dm_enabled_list)
  LOGIN_ACTIVE=1
  trap 'login_exit' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
}

login_rollback() {
  local i path unit rc=0
  [ "$LOGIN_ACTIVE" = 1 ] || return 0
  if [ "$LOGIN_DM_CHANGED" = 1 ]; then
    sudo systemctl disable sddm.service >/dev/null 2>&1 || rc=1
    for unit in "${LOGIN_ENABLED[@]}"; do
      sudo systemctl enable --force "$unit.service" >/dev/null 2>&1 || rc=1
    done
  fi
  # Restore targets before links, including the original display-manager alias.
  for ((i=${#LOGIN_PATHS[@]} - 1; i>=0; i--)); do
    path="${LOGIN_PATHS[i]}"
    if sudo test -e "$LOGIN_BACKUP/$i" || sudo test -L "$LOGIN_BACKUP/$i"; then
      sudo rm -rf -- "$path" && sudo cp -a -- "$LOGIN_BACKUP/$i" "$path" || rc=1
    else
      sudo rm -rf -- "$path" || rc=1
    fi
  done
  LOGIN_ACTIVE=0
  if [ "$rc" = 0 ]; then
    sudo rm -rf -- "$LOGIN_BACKUP"
    warn "Previous login files and display-manager enablement restored. Installed packages were retained."
  else
    err "Login rollback was incomplete. Backups retained at $LOGIN_BACKUP; check display-manager.service before logging out."
  fi
  return "$rc"
}

login_exit() {
  local rc=$?
  login_rollback || rc=1
  sudo_cleanup
  return "$rc"
}

login_commit() {
  LOGIN_ACTIVE=0
  sudo rm -rf -- "$LOGIN_BACKUP" || warn "Could not remove login backup: $LOGIN_BACKUP"
}

login_write_idle() {
  local file="$1" command="$2" tmp
  mkdir -p "$(dirname "$file")" || return 1
  tmp="$(mktemp "$(dirname "$file")/.hypridle.XXXXXX")" || return 1
  # Preserve existing permissions when replacing the file atomically.
  if [ -f "$file" ]; then
    cp -p -- "$file" "$tmp" || { rm -f -- "$tmp"; return 1; }
  fi
  if ! awk -v lock="$command" '
    /^[[:space:]]*general[[:space:]]*\{/ {
      general=1; found=1; print; print "  lock_cmd = " lock; next
    }
    general && /^[[:space:]]*lock_cmd[[:space:]]*=/ { next }
    general && /^[[:space:]]*}/ { general=0 }
    { print }
    END {
      if (!found) print "general {\n  lock_cmd = " lock "\n  before_sleep_cmd = loginctl lock-session\n}"
    }
  ' "$(if [ -f "$file" ]; then printf '%s' "$file"; else printf /dev/null; fi)" > "$tmp"; then
    rm -f -- "$tmp"
    return 1
  fi
  mv -f -- "$tmp" "$file" || { rm -f -- "$tmp"; return 1; }
}
