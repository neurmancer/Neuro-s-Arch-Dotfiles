#!/usr/bin/env bash
# Sourced by the installer before package or configuration changes.
theme_location_confirm() {
  local answer=""
  printf 'Back up the existing theme path and activate this checkout? (y/N) '
  read -r answer </dev/tty 2>/dev/null || return 1
  case "$answer" in [yY]|[yY][eE][sS]) return 0 ;; *) return 1 ;; esac
}

theme_location_prepare() (
  local source canonical current backup=""
  source="$(cd "$1" && pwd -P)" || return 1
  canonical="$2"
  current="$(readlink -f -- "$canonical" 2>/dev/null || true)"
  if [ "$source" = "$current" ]; then
    ok "theme path already resolves to this checkout: $source"
    return 0
  fi

  if [ -e "$canonical" ] || [ -L "$canonical" ]; then
    # Moving an ancestor would move the installer and invalidate its own paths.
    if [ -d "$canonical" ] && [ ! -L "$canonical" ]; then
      case "$source/" in
      "$current/"*)
        err "This checkout is inside the existing theme directory: $current"
        err "Move this checkout outside that directory and re-run the installer."
        return 1 ;;
      esac
    fi
    warn "Existing theme path: $canonical → ${current:-unresolved symlink}"
    warn "Requested checkout: $source"
    local origin
    origin="$(git -C "$canonical" remote get-url origin 2>/dev/null || true)"
    [ -z "$origin" ] || warn "Existing origin: $origin"
    origin="$(git -C "$source" remote get-url origin 2>/dev/null || true)"
    [ -z "$origin" ] || step "Requested origin: $origin"
    if ! theme_location_confirm; then
      err "Installation stopped; the existing theme path was left unchanged."
      return 1
    fi
    backup="$(mktemp -d "${canonical}.backup.XXXXXX")" || return 1
    # Keep the original directory or symlink, including uncommitted changes.
    # Restore it if linking fails or the migration is interrupted.
    trap '
      if [ -e "$backup/original" ] || [ -L "$backup/original" ]; then
        if [ ! -e "$canonical" ] && [ ! -L "$canonical" ]; then
          mv -T -- "$backup/original" "$canonical" && rmdir -- "$backup" \
            || err "Restore the saved theme manually from $backup/original"
        else
          err "Theme path is occupied; the previous theme is saved at $backup/original"
        fi
      else
        rmdir -- "$backup" 2>/dev/null || true
      fi
    ' EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    mv -T -- "$canonical" "$backup/original" || return 1
  else
    mkdir -p -- "$(dirname "$canonical")" || return 1
  fi

  ln -sT -- "$source" "$canonical" || return 1
  trap - EXIT INT TERM
  [ -z "$backup" ] || ok "Previous theme path saved at $backup/original"
  ok "linked $canonical → $source"
)
