#!/usr/bin/env python3
"""Compare two benchmark runs (tools/bench.js) image by image and time by time.

For every view PNG present in both folders:
  - mean / max absolute difference (0-255) and the share of pixels that differ by more than 6 and 24 levels
  - SSIM on luminance (Gaussian-free 8x8 block version, the standard constants), 1.0 = identical structure
  - a heatmap <B>/diff_<view>.png: the B image darkened, changed pixels in red (brightness = size of the change)
and the frame time / per-pass timings from bench.json side by side.
Usage: python3 tools/imgdiff.py <dirA> <dirB> [--quiet]
"""
import sys, os, json
import numpy as np
from PIL import Image


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def ssim(x, y, b=8):
    h, w = x.shape
    h, w = h - h % b, w - w % b
    x = x[:h, :w].reshape(h // b, b, w // b, b).astype(np.float64)
    y = y[:h, :w].reshape(h // b, b, w // b, b).astype(np.float64)
    mx, my = x.mean(axis=(1, 3)), y.mean(axis=(1, 3))
    vx, vy = x.var(axis=(1, 3)), y.var(axis=(1, 3))
    cxy = ((x - mx[:, None, :, None]) * (y - my[:, None, :, None])).mean(axis=(1, 3))
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    s = ((2 * mx * my + c1) * (2 * cxy + c2)) / ((mx ** 2 + my ** 2 + c1) * (vx + vy + c2))
    return float(s.mean()), float(s.min())


def compare(pa, pb, outp):
    A = np.asarray(Image.open(pa).convert('RGB')).astype(np.int16)
    B = np.asarray(Image.open(pb).convert('RGB')).astype(np.int16)
    if A.shape != B.shape:
        return {'error': f'size {A.shape} vs {B.shape}'}
    d = np.abs(A - B).max(axis=2)
    s, smin = ssim(lum(A), lum(B))
    flat = [n for n, X in (('A', A), ('B', B)) if float(lum(X).std()) < 6]
    r = {'mean': round(float(d.mean()), 3), 'max': int(d.max()), 'gt6%': round(float((d > 6).mean() * 100), 3),
         'gt24%': round(float((d > 24).mean() * 100), 3), 'ssim': round(s, 5), 'ssim_min_block': round(smin, 4)}
    if flat:
        r['WARNING'] = 'nearly one colour (broken render?): ' + ','.join(flat)
    if outp:
        base = (B * 0.35).astype(np.uint8)
        k = np.clip(d * 6, 0, 255).astype(np.uint8)
        m = d > 2
        base[m] = np.stack([np.maximum(k[m], 90), k[m] // 4, k[m] // 4], axis=1)
        Image.fromarray(base).save(outp)
    return r


def main():
    a, b = sys.argv[1], sys.argv[2]
    ja = json.load(open(os.path.join(a, 'bench.json'))) if os.path.exists(os.path.join(a, 'bench.json')) else {'views': {}}
    jb = json.load(open(os.path.join(b, 'bench.json'))) if os.path.exists(os.path.join(b, 'bench.json')) else {'views': {}}
    views = sorted(set(f[:-4] for f in os.listdir(a) if f.endswith('.png') and not f.startswith('diff_'))
                   & set(f[:-4] for f in os.listdir(b) if f.endswith('.png') and not f.startswith('diff_')))
    print(f'A = {a} ({ja.get("label","")})\nB = {b} ({jb.get("label","")})')
    for v in views:
        r = compare(os.path.join(a, v + '.png'), os.path.join(b, v + '.png'), os.path.join(b, 'diff_' + v + '.png'))
        ta, tb = ja['views'].get(v, {}), jb['views'].get(v, {})
        line = f'{v:10s} image: ' + ' '.join(f'{k} {val}' for k, val in r.items())
        if ta and tb:
            fa, fb = ta.get('frameMs', ta['ms']), tb.get('frameMs', tb['ms'])
            line += f'\n{"":10s} frame: {fa} -> {fb} ms ({(fb/max(fa,1e-6)-1)*100:+.0f}%), JS: {ta.get("cpuMs","?")} -> {tb.get("cpuMs","?")} ms, draws {ta["draws"]} -> {tb["draws"]}, tris {ta["tris"]/1e6:.2f}M -> {tb["tris"]/1e6:.2f}M'
            if '--quiet' not in sys.argv:
                ks = list(dict.fromkeys(list(ta['passes']) + list(tb['passes'])))
                line += '\n' + '\n'.join(f'{"":12s}{k:12s} {ta["passes"].get(k,0):8.1f} {tb["passes"].get(k,0):8.1f}' for k in ks if max(ta['passes'].get(k, 0), tb['passes'].get(k, 0)) >= 0.5)
        print(line)


if __name__ == '__main__':
    main()
