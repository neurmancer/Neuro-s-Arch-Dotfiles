#!/usr/bin/env python3
"""Regression checks without touching a real desktop/session bus."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ThemeStartup(unittest.TestCase):
    def test_supervisor_runs_ags_shell_wrapper(self):
        self.run_supervisor(False)

    def test_unready_live_shell_is_terminated_and_retried(self):
        self.run_supervisor(True)

    def run_supervisor(self, hangs):
        with tempfile.TemporaryDirectory() as temp:
            work = Path(temp)
            scripts = work / 'theme/scripts'
            scripts.mkdir(parents=True)
            for name in ('launch-theme', 'runtime.sh'):
                shutil.copy2(ROOT / 'scripts' / name, scripts / name)
            runtime = work / 'runtime'
            build = runtime / 'cyberarch-test/build'
            build.mkdir(parents=True)
            (build.parent / 'current').symlink_to(build)
            marker = work / 'started'
            (build / 'shell.js').write_text('#!/bin/bash\necho started >> "$MARKER"\n' +
                                           ('exec /usr/bin/sleep 300\n' if hangs else 'exit 1\n'))
            fake = work / 'bin'
            fake.mkdir()
            for name, code in [('astal', 'exit 1'), ('sleep', 'exit 0'),
                               ('gjs', 'echo wrong-runner >&2; exit 99')]:
                path = fake / name
                path.write_text('#!/bin/sh\n' + code + '\n')
                path.chmod(0o755)
            env = dict(os.environ, HOME=temp, XDG_RUNTIME_DIR=str(runtime),
                       XDG_STATE_HOME=str(work / 'state'), HYPRLAND_INSTANCE_SIGNATURE='test',
                       WAYLAND_DISPLAY='wayland-test', AGS_BIN='/bin/true', MARKER=str(marker),
                       PATH=str(fake) + ':' + os.environ['PATH'])
            with socket.socket(socket.AF_UNIX) as display:
                display.bind(str(runtime / 'wayland-test'))
                result = subprocess.run(['bash', str(scripts / 'launch-theme')], env=env,
                                        capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertEqual(marker.read_text().splitlines(), ['started'] * 5)

    @unittest.skipUnless(shutil.which('luac'), 'Lua compiler required')
    def test_opacity_helper_parses(self):
        result = subprocess.run(['luac', '-p', str(ROOT / 'config/wm-opacity.lua')],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
