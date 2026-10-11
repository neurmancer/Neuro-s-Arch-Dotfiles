#!/usr/bin/env python3
"""Preference preservation tests against disposable files, including symlinks."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('theme_config', ROOT / 'scripts/theme-config.py')
theme = importlib.util.module_from_spec(spec)
spec.loader.exec_module(theme)


class Preferences(unittest.TestCase):
    def test_gtk_preserves_accessibility_and_shared_symlink_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shared = root / 'shared.ini'
            original = '[Settings]\ngtk-font-name=Sans 18\ngtk-enable-animations=false\n'
            shared.write_text(original)
            user = root / 'settings.ini'
            user.symlink_to(shared)
            theme.ini(user, 'Settings', ['gtk-theme-name=Adwaita-dark'])
            self.assertEqual(shared.read_text(), original)
            config = theme.configparser.ConfigParser()
            config.read(user)
            self.assertEqual(config['Settings']['gtk-font-name'], 'Sans 18')
            self.assertEqual(config['Settings']['gtk-enable-animations'], 'false')


if __name__ == '__main__':
    unittest.main(verbosity=2)
