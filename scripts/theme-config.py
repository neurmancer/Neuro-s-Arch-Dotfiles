#!/usr/bin/env python3
"""Update theme-owned configuration fields while preserving user preferences."""
import configparser
import fcntl
import io
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import tomllib


def write(path, text):
    # Replace the user-facing symlink, never mutate its shared/system target.
    path = Path(path).absolute()
    path.parent.mkdir(parents=True, exist_ok=True)
    backup = path.with_name(path.name + '.before-cyberarch')
    if path.exists() and not backup.exists():
        shutil.copy2(path, backup)
    fd, name = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def kitty(src, dst):
    source = Path(src)
    style = tomllib.loads(source.read_text())
    colors = {}
    if 'theme' in style:
        name = style['theme']
        if not isinstance(name, str) or Path(name).name != name:
            raise ValueError('invalid theme filename')
        colors.update(tomllib.loads((source.parent.parent / 'themes' / (name + '.toml')).read_text())['colors'])
    colors.update(style.get('colors', {}))
    bg, fg = colors['background'], colors['foreground']
    accent, secondary = colors['red'], colors.get('cursor', colors['green'])
    mapped = dict(background=bg, foreground=fg, cursor=secondary, cursor_text_color=bg,
                  selection_background=colors.get('selection-background', accent),
                  selection_foreground=colors.get('selection-foreground', bg),
                  url_color=secondary, active_border_color=accent,
                  inactive_border_color=colors.get('light-black', bg),
                  visual_bell_color=accent, active_tab_background=accent,
                  active_tab_foreground=bg, inactive_tab_background=bg,
                  inactive_tab_foreground=fg, tab_bar_background=bg)
    for index, name in enumerate(('black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white')):
        mapped['color' + str(index)] = colors[name]
        mapped['color' + str(index + 8)] = colors.get('light-' + name, colors[name])
    for index, color in enumerate((accent, secondary, fg), 1):
        mapped[f'mark{index}_background'] = color
        mapped[f'mark{index}_foreground'] = bg
    for value in mapped.values():
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
            raise ValueError('Invalid terminal color: ' + str(value))
    target = Path(dst)
    generated = target.parent / 'cyberarch-colors.conf'
    write(generated, '# CyberArch palette: ' + source.stem + '\n' +
          ''.join(f'{key} {value}\n' for key, value in mapped.items()))
    old = target.read_text() if target.exists() else ''
    if not re.search(r'(?m)^\s*(?:globinclude|include)\s+cyberarch-colors\.conf\s*$', old):
        # If the user's config is a symlink, detach only when adding the include;
        # never edit a shared checkout or a system-owned config through that link.
        if target.is_symlink():
            backup = target.with_name(target.name + '.before-cyberarch')
            if not backup.exists(): shutil.copy2(target, backup)
            fd, stage = tempfile.mkstemp(dir=target.parent)
            with os.fdopen(fd, 'w') as out: out.write(old)
            os.replace(stage, target)
        write(target, old.rstrip() + '\n\n# Follow the selected CyberArch palette.\nglobinclude cyberarch-colors.conf\n')


def ini(path, group, pairs):
    config = configparser.ConfigParser(interpolation=None, strict=False)
    config.optionxform = str
    config.read(path)
    if group not in config:
        config[group] = {}
    for pair in pairs:
        key, value = pair.split('=', 1)
        config[group][key] = value
    out = io.StringIO()
    config.write(out)
    write(path, out.getvalue())


def css(path, generated):
    path = Path(path)
    old = path.read_text() if path.exists() else ''
    # Preserve custom CSS after the import, so user overrides retain precedence.
    marker = '/* cyberarch theme */'
    old = '\n'.join(line for line in old.splitlines() if marker not in line)
    import_line = f'@import url("{Path(generated).as_uri()}"); {marker}\n'
    write(path, import_line + old + '\n')


def main():
    cfg = Path(os.environ.get('XDG_CONFIG_HOME', Path.home() / '.config')) / 'cyberarch'
    cfg.mkdir(parents=True, exist_ok=True)
    with (cfg / '.config-write.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        {'kitty': kitty, 'ini': lambda p, g, *args: ini(p, g, args), 'css': css}[sys.argv[1]](*sys.argv[2:])


if __name__ == '__main__':
    main()
