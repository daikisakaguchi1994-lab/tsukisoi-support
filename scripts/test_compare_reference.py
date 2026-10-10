"""compare-reference.py の回帰テスト。実行: python3 scripts/test_compare_reference.py"""
import os
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(__file__), 'compare-reference.py')
A, B = '甲乙丙丁戊己庚辛壬癸子', '乙丙丁戊己庚辛壬癸子丑'


def run(ref, dist):
    return subprocess.run([sys.executable, '-I', SCRIPT, '--ref-dir', ref, '--dist', dist], capture_output=True, text=True)


def write(d, name, body):
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), 'w', encoding='utf-8') as f:
        f.write(f'<html><body><p>{body}</p></body></html>')


class CompareReference(unittest.TestCase):
    def setUp(self):
        self.t = tempfile.mkdtemp()
        self.ref, self.dist = os.path.join(self.t, 'ref'), os.path.join(self.t, 'dist')

    def test_empty_ref_dir_fails(self):
        write(self.dist, 'index.html', A)
        os.makedirs(self.ref)
        r = run(self.ref, self.dist)
        self.assertEqual(r.returncode, 2)
        self.assertIn('0件', r.stderr)

    def test_missing_dist_fails(self):
        write(self.ref, 'a.html', A)
        r = run(self.ref, self.dist)
        self.assertEqual(r.returncode, 2)

    def test_does_not_join_fragments_across_reference_pages(self):
        write(self.ref, 'a.html', A)
        write(self.ref, 'b.html', B)
        write(self.dist, 'index.html', '甲乙丙丁戊己庚辛壬癸子丑')  # どの参照にも連続して存在しない12文字
        out = run(self.ref, self.dist).stdout
        self.assertNotIn('甲乙丙丁戊己庚辛壬癸子丑', out)
        self.assertIn('甲乙丙丁戊己庚辛壬癸子', out)

    def test_reports_origin(self):
        write(self.ref, 'a.html', 'あ' + A)
        write(self.dist, 'index.html', A)
        out = run(self.ref, self.dist).stdout
        self.assertIn('出典: a.html@1', out)


if __name__ == '__main__':
    unittest.main()
