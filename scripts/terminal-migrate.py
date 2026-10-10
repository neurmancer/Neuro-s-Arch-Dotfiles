#!/usr/bin/env python3
"""Migrate configuration left by the former terminal integrations."""
import os
from pathlib import Path
import shutil


def migrate(home, config, data):
    fish = config / 'fish/config.fish'
    if fish.is_file():
        old = fish.read_text()
        new = old.replace('assets/cool-retro-term/samurai.png', 'assets/kitty/samurai.png')
        if new != old:
            backup = fish.with_name('config.fish.before-kitty-migration')
            if not backup.exists():
                shutil.copy2(fish, backup)
            fish.write_text(new)
    # Archive only launchers pointing to binaries installed by this project.
    # Leave independently installed terminals and their preferences alone.
    for name, executable in (
        ('rio.desktop', home / '.cargo/bin/rio'),
        ('cool-retro-term.desktop', home / '.local/bin/cool-retro-term'),
    ):
        desktop = data / 'applications' / name
        if not desktop.is_file():
            continue
        commands = [line[5:].strip() for line in desktop.read_text().splitlines() if line.startswith('Exec=')]
        if not commands or not all(cmd == str(executable) or cmd.startswith(str(executable) + ' ') for cmd in commands):
            continue
        backup = desktop.with_name(name + '.before-kitty-migration')
        if not backup.exists():
            desktop.rename(backup)


if __name__ == '__main__':
    home = Path.home()
    migrate(home, Path(os.environ.get('XDG_CONFIG_HOME', home / '.config')),
            Path(os.environ.get('XDG_DATA_HOME', home / '.local/share')))
