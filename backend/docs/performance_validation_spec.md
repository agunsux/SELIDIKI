# ⚡ Performance Validation Spec — Commit #13

**Date:** 2026-07-09 | **Baseline:** `test/baseline_snapshot.json`

---

## Benchmarks

| Operation | FS Baseline | PG Target | Max Regression |
|---|---|---|---|
| Phone lookup (`findByHash`) | ~3ms | <5ms | <5% |
| Bank account lookup (`findByHashAndBank`) | ~4ms | <6ms | <5% |
| Report insert (`insert`) | ~3ms | <10ms | <10% (transaction) |
| Report trending (`findTrending`) | ~5ms | <8ms | <5% |
| History insert (`insert`) | ~5ms | <8ms | <5% |
| History read (`findByUserHash`) | ~5ms | <8ms | <5% |
| User insert (`insert`) | ~4ms | <6ms | <5% |
| User lookup (`findByHash`) | ~4ms | <6ms | <5% |

## Dual Write Overhead

| Metric | Baseline | With Dual Write | Overhead |
|---|---|---|---|
| Write latency (p50) | TBD | TBD | <5% |
| Write latency (p95) | TBD | TBD | <10% |
| Write latency (p99) | TBD | TBD | <15% |

## Shadow Overhead

| Metric | Baseline | With Shadow | Overhead |
|---|---|---|---|
| Read latency (p50) | TBD | TBD | 0% (async) |
| Memory usage | TBD | TBD | <5% |
| Event loop lag | TBD | TBD | <5ms |
