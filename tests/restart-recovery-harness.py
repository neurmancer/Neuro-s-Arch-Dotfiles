#!/usr/bin/env python3
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]

class Recovery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.work = Path(self.tmp.name); self.scripts = self.work / 'scripts'; self.scripts.mkdir()
        self.runtime = self.work / 'runtime'; self.runtime.mkdir()
        self.session = self.runtime / 'cyberarch-test'; self.session.mkdir()
        self.good = self.session / 'good'; self.good.mkdir()
        for name in ('shell.js','shell.css'): (self.good/name).write_text('good')
        for name in ('current','healthy'): (self.session/name).symlink_to(self.good)
        self.live=self.work/'live'; self.live.write_text(str(self.good))
        self.bin=self.work/'bin';self.bin.mkdir()
        for name in ('restart','runtime.sh'): shutil.copy2(ROOT/'scripts'/name,self.scripts/name)
        self.exe(self.bin/'astal','cat "$LIVE"')
        self.exe(self.bin/'ags',': > "$LIVE"')
        self.exe(self.bin/'sleep','/usr/bin/sleep 0.01')
        self.exe(self.scripts/'launch-theme', '''
if [ "${1:-}" = --prepare ]; then
    [ "${FAIL_BUILD:-0}" != 1 ] || exit 73
    mkdir -p "$SESSION/candidate"
    printf candidate > "$SESSION/candidate/shell.js"
    printf css > "$SESSION/candidate/shell.css"
    ln -sfn "$SESSION/candidate" "$SESSION/current"
else
    target=$(readlink -f "$SESSION/current")
    if [ "$target" = "$SESSION/good" ] || [ "${GOOD_CANDIDATE:-0}" = 1 ]; then printf '%s' "$target" > "$LIVE"; fi
fi
''')
        self.env=dict(os.environ, XDG_RUNTIME_DIR=str(self.runtime),HYPRLAND_INSTANCE_SIGNATURE='test',
                      HOME=str(self.work),AGS_BIN=str(self.bin/'ags'),LIVE=str(self.live),SESSION=str(self.session),
                      PATH=str(self.bin)+':'+os.environ['PATH'])
    def exe(self,path,body):
        path.write_text('#!/bin/bash\nset -eu\n'+body+'\n');path.chmod(0o755)
    def run_restart(self,code,**extra):
        result=subprocess.run(['bash',str(self.scripts/'restart')],env=dict(self.env,**extra),capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,code,result.stderr)
    def test_stale_compositor_environment_uses_matching_display(self):
        self.exe(self.bin/'hyprctl', "printf '%s' '[{\"instance\":\"live\",\"wl_socket\":\"wayland-test\"}]'")
        result = subprocess.run(['bash', '-c', '. "$1"; printf "%s" "$HYPRLAND_INSTANCE_SIGNATURE"',
                                 'test', str(self.scripts/'runtime.sh')],
                                env=dict(self.env, WAYLAND_DISPLAY='wayland-test'), capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, 'live')

    def test_failed_build_does_not_stop_shell(self):
        self.run_restart(73,FAIL_BUILD='1')
        self.assertEqual(self.live.read_text(),str(self.good))
    def test_repeated_bad_candidates_keep_verified_rollback(self):
        for _ in range(2):
            self.run_restart(1)
            self.assertEqual((self.session/'current').resolve(),self.good)
            self.assertEqual((self.session/'healthy').resolve(),self.good)
            self.assertEqual(self.live.read_text(),str(self.good))
    def test_success_promotes_only_ready_candidate(self):
        self.run_restart(0,GOOD_CANDIDATE='1')
        self.assertEqual((self.session/'healthy').resolve(),self.session/'candidate')
    def test_actual_prepare_preserves_healthy_pointer(self):
        shutil.copy2(ROOT/'scripts/launch-theme',self.scripts/'launch-theme')
        self.exe(self.scripts/'preflight','mkdir -p "$1"; echo candidate > "$1/shell.js"; echo css > "$1/shell.css"')
        for _ in range(2):
            p=subprocess.run(['bash',str(self.scripts/'launch-theme'),'--prepare'],env=self.env,capture_output=True,text=True)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertEqual((self.session/'healthy').resolve(),self.good)
            self.assertNotEqual((self.session/'current').resolve(),self.good)

if __name__ == '__main__': unittest.main(verbosity=2)
