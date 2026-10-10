import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('migration', ROOT / 'scripts/terminal-migrate.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class Migration(unittest.TestCase):
    def test_existing_installation_and_repeat(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            config = home / 'config'
            data = home / 'data'
            fish = config / 'fish/config.fish'
            fish.parent.mkdir(parents=True)
            original = 'set -g my_setting preserved\nkitten icat $HOME/.config/hypr/themes/cyberpunk/assets/cool-retro-term/samurai.png\n'
            fish.write_text(original)
            apps = data / 'applications'
            apps.mkdir(parents=True)
            (apps / 'rio.desktop').write_text(f'Exec={home}/.cargo/bin/rio --app-id rio\n')
            (apps / 'cool-retro-term.desktop').write_text('Exec=/usr/bin/cool-retro-term\n')
            for _ in range(2):
                m.migrate(home, config, data)
                self.assertEqual(fish.read_text(), original.replace('cool-retro-term', 'kitty'))
                self.assertEqual(fish.with_name('config.fish.before-kitty-migration').read_text(), original)
                self.assertFalse((apps / 'rio.desktop').exists())
                self.assertTrue((apps / 'rio.desktop.before-kitty-migration').exists())
                self.assertTrue((apps / 'cool-retro-term.desktop').exists())

if __name__ == '__main__':
    unittest.main(verbosity=2)
