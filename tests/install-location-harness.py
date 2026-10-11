#!/usr/bin/env python3
"""Test checkout migration with temporary directories; never touch the desktop."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ThemeLocation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='theme-location-')
        self.addCleanup(self.tmp.cleanup)
        self.work = Path(self.tmp.name)
        self.checkout = self.work / 'new checkout'
        self.checkout.mkdir()
        self.canonical = self.work / 'theme'

    def prepare(self, consent=True, fail_link=False, expected=0, source=None):
        body = '''
source "$1/scripts/install-location.sh"
ok() { :; }; step() { :; }; warn() { :; }; err() { echo "$*" >&2; }
'''
        body += 'theme_location_confirm() { return ' + ('0' if consent else '1') + '; }\n'
        if fail_link:
            body += 'ln() { return 1; }\n'
        body += 'theme_location_prepare "$2" "$3"\n'
        result = subprocess.run(['bash', '-uo', 'pipefail', '-c', body, 'test',
                                 str(ROOT), str(source or self.checkout), str(self.canonical)],
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, expected, result.stderr)
        return result

    def test_fresh_install(self):
        self.prepare()
        self.assertEqual(self.canonical.resolve(), self.checkout)

    def test_same_checkout_is_unchanged(self):
        self.canonical.symlink_to(self.checkout)
        self.prepare(consent=False)
        self.assertEqual(self.canonical.resolve(), self.checkout)
        self.assertEqual(list(self.work.glob('theme.backup.*')), [])

    def test_real_directory_migration_preserves_local_edits(self):
        self.canonical.mkdir()
        (self.canonical / 'local-edit').write_text('keep me')
        self.prepare()
        backup, = self.work.glob('theme.backup.*')
        self.assertEqual((backup / 'original/local-edit').read_text(), 'keep me')
        self.assertEqual(self.canonical.resolve(), self.checkout)

    def test_declined_migration_leaves_old_directory(self):
        self.canonical.mkdir()
        (self.canonical / 'local-edit').write_text('keep me')
        self.prepare(consent=False, expected=1)
        self.assertFalse(self.canonical.is_symlink())
        self.assertEqual((self.canonical / 'local-edit').read_text(), 'keep me')
        self.assertEqual(list(self.work.glob('theme.backup.*')), [])

    def test_other_checkout_symlink_is_preserved(self):
        old = self.work / 'old checkout'
        old.mkdir()
        (old / 'local-edit').write_text('keep me')
        self.canonical.symlink_to(old)
        self.prepare()
        backup, = self.work.glob('theme.backup.*')
        self.assertTrue((backup / 'original').is_symlink())
        self.assertEqual(os.readlink(backup / 'original'), str(old))
        self.assertEqual((old / 'local-edit').read_text(), 'keep me')
        self.assertEqual(self.canonical.resolve(), self.checkout)

    def test_broken_symlink_can_be_migrated(self):
        self.canonical.symlink_to(self.work / 'missing/checkout')
        self.prepare()
        backup, = self.work.glob('theme.backup.*')
        self.assertTrue((backup / 'original').is_symlink())
        self.assertEqual(self.canonical.resolve(), self.checkout)

    def test_link_failure_restores_old_directory(self):
        self.canonical.mkdir()
        (self.canonical / 'local-edit').write_text('keep me')
        self.prepare(fail_link=True, expected=1)
        self.assertFalse(self.canonical.is_symlink())
        self.assertEqual((self.canonical / 'local-edit').read_text(), 'keep me')
        self.assertEqual(list(self.work.glob('theme.backup.*')), [])

    def test_nested_checkout_is_not_moved(self):
        self.canonical.mkdir()
        nested = self.canonical / 'nested'
        nested.mkdir()
        self.prepare(source=nested, expected=1)
        self.assertTrue(nested.is_dir())
        self.assertFalse(self.canonical.is_symlink())

    def test_launcher_resolves_own_checkout_through_symlink(self):
        scripts = self.checkout / 'scripts'
        scripts.mkdir()
        launcher = scripts / 'launch-theme'
        # Run the launcher's actual path-selection code without invoking AGS.
        code = (ROOT / 'scripts/launch-theme').read_text().split('[ -x "$AGS_BIN" ]')[0]
        launcher.write_text(code + '\nprintf "%s\\n" "$CORE_TS"\n')
        link = self.work / 'launcher-link'
        link.symlink_to(launcher)
        result = subprocess.run(['bash', str(link)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), str(self.checkout / 'core.ts'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
