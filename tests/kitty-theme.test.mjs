import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('all palettes generate Kitty colors and preserve user configuration', () => {
const result = spawnSync('python3', ['-B', '-c', String.raw`
import importlib.util, pathlib, tempfile
root = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('theme_config', root / 'scripts/theme-config.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as tmp:
    target = pathlib.Path(tmp) / 'kitty.conf'
    original = 'font_size 17\nbackground_opacity 0.63\nmap ctrl+x close_window\n'
    target.write_text(original)
    styles = sorted((root / 'assets/kitty/styles').glob('*.toml'))
    assert len(styles) == 9
    for style in styles:
        m.kitty(style, target)
        assert target.read_text().startswith(original)
        assert target.read_text().count('globinclude cyberarch-colors.conf') == 1
        generated = (target.parent / 'cyberarch-colors.conf').read_text()
        assert 'color15 ' in generated and 'active_tab_background ' in generated
        assert 'font_size' not in generated and 'background_opacity' not in generated
        if style.stem == 'nsd':
            assert 'active_border_color #C170FF' in generated
            assert 'cursor #00EB74' in generated
    assert target.with_name('kitty.conf.before-cyberarch').read_text() == original
    shared = pathlib.Path(tmp) / 'shared.conf'; shared.write_text(original)
    target.unlink(); target.symlink_to(shared)
    m.kitty(root / 'assets/kitty/styles/nsd.toml', target)
    assert shared.read_text() == original
    assert not target.is_symlink()
print('All nine palettes, repeated updates, backups, symlink isolation, and preference preservation passed')
`], { encoding: 'utf8' })
assert.equal(result.status, 0, result.stderr)
console.log(result.stdout.trim())
})
