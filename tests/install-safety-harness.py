#!/usr/bin/env python3
"""Installer safety regressions. All privileged commands are mocked in /tmp."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
INSTALL = (ROOT / 'install.sh').read_text()


class InstallerSafety(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='installer-safety-')
        self.addCleanup(self.tmp.cleanup)
        self.work = Path(self.tmp.name)
        self.bin = self.work / 'bin'
        self.bin.mkdir()
        self.log = self.work / 'commands'
        self.env = dict(os.environ, PATH=f'{self.bin}:{os.environ["PATH"]}',
                        AUDIT_LOG=str(self.log), AUDIT_HOME=str(self.work),
                        AUDIT_ROOT=str(ROOT), TERM='dumb')
        for key in ('AUG_DRYRUN', 'SUDO_USER', 'HYPRLAND_INSTANCE_SIGNATURE',
                    'DISPLAY', 'WAYLAND_DISPLAY', 'BASH_ENV'):
            self.env.pop(key, None)
        self.stub('clear', 'exit 0')
        self.stub('id', 'echo 1000')

    def stub(self, name, body):
        path = self.bin / name
        path.write_text('#!/bin/bash\n' + body + '\n')
        path.chmod(0o755)

    def run_bash(self, body, expected=0):
        result = subprocess.run(['bash', '-uo', 'pipefail', '-c', body],
                                env=self.env, text=True, capture_output=True,
                                start_new_session=True, timeout=20)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result

    def test_dry_run_is_read_only_without_tty(self):
        self.stub('sudo', 'echo "UNEXPECTED sudo $*" >> "$AUDIT_LOG"; exit 90')
        self.stub('pacman', '''echo "pacman $*" >> "$AUDIT_LOG"
case "$1" in -Qq|-Qg) exit 1;; *) exit 91;; esac''')
        for argument, variable in [('--dry-run', ''), ('', '1')]:
            with self.subTest(argument=argument, variable=variable):
                self.env['AUG_DRYRUN'] = variable
                result = self.run_bash(f'bash "$AUDIT_ROOT/install.sh" {argument}')
                self.assertIn('no changes will be made', result.stdout)
                self.assertNotIn('/dev/tty', result.stderr)
                self.assertNotIn('UNEXPECTED', self.log.read_text())
                self.assertTrue(all(line.startswith(('pacman -Qq ', 'pacman -Qg '))
                                    for line in self.log.read_text().splitlines()))

    def test_no_partial_database_refresh(self):
        # Covers every package-manager call, including recovery instructions.
        import re
        self.assertFalse(re.search(r'pacman\s+-[A-Za-z]*S[A-Za-z]*y(?![A-Za-z]*u)(?:\s|$)', INSTALL))

    def test_final_summary_without_legacy_terminal_variables(self):
        start = INSTALL.index('printf "${RED}${B}"',
                              INSTALL.index('hdr "MESA PACKAGES INSTALLATION"'))
        # Execute the real final summary and decline logout, replacing only the
        # interactive input device. No installer or session changes are run.
        summary = INSTALL[start:].replace('read -r ans </dev/tty', 'read -r ans')
        for command in ('sudo', 'hyprctl', 'loginctl', 'systemctl', 'qdbus', 'qdbus-qt6'):
            self.stub(command, 'echo "UNEXPECTED $0 $*" >> "$AUDIT_LOG"; exit 90')
        for restart in (0, 1):
            for greeter in (0, 1):
                with self.subTest(restart=restart, greeter=greeter):
                    prefix = f'''
unset GTKEY WAYLAND_DISPLAY DISPLAY
R=; B=; RED=; GRN=; GREY=; YEL=; CYAN=
NEED_RESTART={restart}
dm_active() {{ return {greeter}; }}
warn() {{ echo "$*"; }}
line() {{ echo SUMMARY_SEPARATOR; }}
'''
                    result = self.run_bash(prefix + '{\n' + summary + '\n} <<< n\n')
                    self.assertIn('SUPER + T    Kitty terminal', result.stdout)
                    self.assertIn('⧉ + H', result.stdout)
                    self.assertIn('Flatline the session yourself when ready', result.stdout)
                    self.assertTrue(result.stdout.rstrip().endswith('SUMMARY_SEPARATOR'))
                    if restart:
                        self.assertIn('A Hyprland restart is required', result.stdout)
                    else:
                        self.assertIn('Installation is complete', result.stdout)
                    prompt = ('Log out now so the theme and greeter come up clean?'
                              if greeter == 0 else 'Start sddm and log out anyway?')
                    self.assertIn(prompt, result.stdout)
                    self.assertFalse(self.log.exists(), 'Summary changed the session')

    def login_fixture(self, mode):
        self.env['AUDIT_MODE'] = mode
        (self.work / '.config/hypr').mkdir(parents=True)
        self.idle = self.work / '.config/hypr/hypridle.conf'
        self.idle.write_text('general {\n  lock_cmd = old-lock\n  before_sleep_cmd = keep-me\n}\n')
        etc = self.work / 'etc'
        (etc / 'pam.d').mkdir(parents=True)
        (etc / 'sddm.conf.d').mkdir()
        (etc / 'systemd/system').mkdir(parents=True)
        self.alias = etc / 'systemd/system/display-manager.service'
        self.alias.symlink_to('/usr/lib/systemd/system/gdm.service')
        (self.work / 'state').write_text('gdm\n')
        self.theme = self.work / 'usr/share/sddm/themes/netwatch'
        self.theme.mkdir(parents=True)
        (self.theme / 'old-theme').write_text('original')
        self.dropin = etc / 'sddm.conf.d/10-netwatch.conf'
        self.dropin.write_text('[Theme]\nCurrent=old-theme\n')
        login = self.work / 'login'
        (login / 'sddm-theme').mkdir(parents=True)
        (login / 'sddm-theme/Main.qml').write_text('// test')
        self.stub('sudo', '''echo "sudo $*" >> "$AUDIT_LOG"
case "$1" in
  pacman) exit 1;;
  tee)
    if [ "$AUDIT_MODE" = pam-fail ] && [[ "$2" = */pam.d/qs-lock ]]; then exit 1; fi
    if [ "$AUDIT_MODE" = dropin-fail ] && [[ "$2" = */10-netwatch.conf ]]; then
      : > "$2"; exit 1
    fi
    exec "$@";;
  install) # Avoid production owner/group lookup in this isolated fixture.
    while [ "$#" -gt 0 ]; do last="$1"; shift; done
    mkdir -p "$last";;
  *) exec "$@";;
esac''')
        self.stub('qs', '[ "$AUDIT_MODE" != qs-fail ]')
        self.stub('sddm', 'exit 0')
        self.stub('pacman', 'echo "hyprland 0.56.0"')
        self.stub('getent', 'exit 0')
        self.stub('pgrep', 'exit 1')
        self.stub('systemctl', '''echo "systemctl $*" >> "$AUDIT_LOG"
unit="${@: -1}"; unit="${unit%.service}"
case "$1" in
  disable) sed -i "/^$unit$/d" "$AUDIT_HOME/state"; rm -f "$AUDIT_HOME/etc/systemd/system/display-manager.service";;
  enable)
    if [ "$unit" = sddm ] && [ "$AUDIT_MODE" = enable-fail ]; then exit 1; fi
    echo "$unit" >> "$AUDIT_HOME/state"
    ln -sfn "/usr/lib/systemd/system/$unit.service" "$AUDIT_HOME/etc/systemd/system/display-manager.service";;
  *) exit 1;;
esac''')
        self.stub('paru', 'exit 1')
        self.stub('yay', 'exit 1')
        # Exercise the actual login section, remapping only absolute system paths.
        body = INSTALL[INSTALL.index('IDLECONF='):INSTALL.index('step "installing news cache cron')]
        body = body.replace('$HOME', '$AUDIT_HOME')
        body = body.replace('/etc/', str(etc) + '/')
        body = body.replace('/usr/share/sddm/', str(self.work / 'usr/share/sddm') + '/')
        prefix = '''
THEME="$AUDIT_ROOT"
LOGINSRC="$AUDIT_HOME/login"; LOGINDST="$LOGINSRC"
USER_DIR="$AUDIT_HOME/config"; WALLPAPERS_PATH="$AUDIT_HOME/wallpapers"
LOCK_STACK=1; CUR_DM=gdm; DM_OLD=gdm
WAYLAND_DISPLAY=wayland-test
hdr() { :; }; ok() { :; }; step() { :; }; warn() { echo "$*"; }; err() { echo "$*"; }
fatal() { echo "$*" >&2; exit 1; }
sudo_cleanup() { :; }
pac_install() { :; }
dm_enabled_list() { cat "$AUDIT_HOME/state"; }
drm_groups_fix() { return 0; }
release_seat() { sudo systemctl disable gdm.service; }
'''
        return prefix + body

    def assert_restored(self):
        self.assertIn('lock_cmd = old-lock', self.idle.read_text())
        self.assertEqual(self.dropin.read_text(), '[Theme]\nCurrent=old-theme\n')
        self.assertEqual((self.theme / 'old-theme').read_text(), 'original')
        self.assertFalse((self.theme / 'Main.qml').exists())
        self.assertFalse((self.work / 'etc/pam.d/qs-lock').exists())
        self.assertFalse((self.work / '.config/qylock/theme').exists())
        self.assertEqual(os.readlink(self.alias), '/usr/lib/systemd/system/gdm.service')
        self.assertEqual((self.work / 'state').read_text().split(), ['gdm'])

    def test_missing_quickshell_preserves_login(self):
        result = self.run_bash(self.login_fixture('qs-fail'), expected=1)
        self.assertIn('could NOT be installed', result.stderr)
        self.assert_restored()
        self.assertNotIn('systemctl disable', self.log.read_text())

    def test_failed_enable_restores_login_and_previous_greeter(self):
        result = self.run_bash(self.login_fixture('enable-fail'), expected=1)
        self.assertIn('could not be made the default', result.stderr)
        self.assertIn('systemctl enable --force sddm', self.log.read_text())
        self.assert_restored()

    def test_pam_failure_preserves_login(self):
        result = self.run_bash(self.login_fixture('pam-fail'), expected=1)
        self.assertIn('could not write', result.stderr)
        self.assert_restored()
        self.assertNotIn('systemctl disable', self.log.read_text())

    def test_partial_dropin_write_restores_files(self):
        result = self.run_bash(self.login_fixture('dropin-fail'), expected=1)
        self.assertIn('Could not write', result.stderr)
        self.assert_restored()
        self.assertNotIn('systemctl disable', self.log.read_text())

    def test_declining_login_setup_leaves_configuration_alone(self):
        body = self.login_fixture('success').replace('LOCK_STACK=1;', 'LOCK_STACK=0;')
        self.run_bash(body)
        self.assert_restored()
        self.assertFalse(self.log.exists())

    def test_success_commits_login(self):
        self.run_bash(self.login_fixture('success'))
        self.assertIn(f'lock_cmd = {self.work}/login/lock.sh', self.idle.read_text())
        self.assertIn('before_sleep_cmd = keep-me', self.idle.read_text())
        self.assertEqual(self.idle.read_text().count('lock_cmd ='), 1)
        self.assertEqual(os.readlink(self.alias), '/usr/lib/systemd/system/sddm.service')
        self.assertEqual((self.work / 'state').read_text().split(), ['sddm'])
        self.assertTrue((self.work / 'etc/pam.d/qs-lock').exists())
        self.assertTrue((self.theme / 'Main.qml').exists())

    def test_idle_rewrite_is_idempotent(self):
        body = self.login_fixture('success')
        body += '\nlogin_write_idle "$IDLECONF" "$LOGINDST/lock.sh"\n'
        self.run_bash(body)
        self.assertEqual(self.idle.read_text().count('lock_cmd ='), 1)

    def test_signal_rolls_back_symlinked_configuration(self):
        self.stub('sudo', 'exec "$@"')
        target = self.work / 'target'
        target.write_text('original\n')
        link = self.work / 'link'
        link.symlink_to(target)
        self.run_bash('''
source "$AUDIT_ROOT/scripts/install-login.sh"
dm_enabled_list() { :; }; sudo_cleanup() { :; }; warn() { :; }; err() { :; }
login_begin "$AUDIT_HOME/link"
echo changed > "$AUDIT_HOME/link"
kill -TERM $$
''', expected=143)
        self.assertTrue(link.is_symlink())
        self.assertEqual(target.read_text(), 'original\n')


if __name__ == '__main__':
    unittest.main(verbosity=2)
