"""Tiện ích dùng chung cho các bài test Python.
Shared helpers for the Python benchmarks."""
import os
import sys
import time

MASK = 0xFFFFFFFF


class Timer:
    """Đồng hồ đo phần việc thật. / Clock around the real work only."""

    def __init__(self):
        self._t0 = time.perf_counter()

    def ms(self):
        return (time.perf_counter() - self._t0) * 1000.0


class Checksum:
    """Checksum 32-bit, phải khớp với mọi ngôn ngữ khác.
    32-bit checksum, must match every other language."""

    __slots__ = ("h",)

    def __init__(self):
        self.h = 2166136261

    def add(self, v):
        h = self.h
        v &= MASK
        for i in range(4):
            h ^= (v >> (i * 8)) & 0xFF
            h = (h * 16777619) & MASK
        self.h = h

    def add_u64(self, v):
        self.add(v & MASK)
        self.add((v >> 32) & MASK)

    def value(self):
        return self.h

    def hex(self):
        return "%08x" % self.h


class Lcg:
    """Sinh số giả ngẫu nhiên xác định. / Deterministic PRNG."""

    __slots__ = ("s",)

    def __init__(self, seed=42):
        self.s = seed & MASK

    def next(self):
        self.s = (self.s * 1664525 + 1013904223) & MASK
        return self.s


def param(key, fallback):
    """Đọc tham số key=value. / Read a key=value parameter."""
    prefix = key + "="
    for a in sys.argv[1:]:
        if a.startswith(prefix):
            return int(a[len(prefix):])
    return fallback


def report(ms, checksum):
    """Dòng duy nhất mà runner đọc. / The single line the runner parses."""
    sys.stdout.write('{"ms": %.3f, "checksum": "%s"}\n' % (ms, checksum))


def add_common_to_path():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
