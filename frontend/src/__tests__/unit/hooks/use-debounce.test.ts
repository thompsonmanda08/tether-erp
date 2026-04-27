/**
 * Unit Tests for useDebounce Hook
 *
 * Tests that:
 *  - The debounced value settles to the latest value after the delay elapses.
 *  - Rapid intermediate updates do NOT propagate — only the final value after
 *    the delay is emitted.
 *  - A delay of 0 ms resolves immediately when timers are advanced.
 *  - The hook returns the initial value before any delay has elapsed.
 *  - Cleanup: changing the value cancels the previous timer (no stale update).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/use-debounce';

// ============================================================================
// TIMER SETUP
// ============================================================================

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllTimers();
});

// ============================================================================
// TESTS
// ============================================================================

describe('useDebounce', () => {
  describe('initial value', () => {
    it('should return the initial value immediately before any delay has elapsed', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      // No timers advanced — should still be the initial value
      expect(result.current).toBe('initial');
    });

    it('should return the initial value for numeric types', () => {
      const { result } = renderHook(() => useDebounce(42, 300));

      expect(result.current).toBe(42);
    });

    it('should return the initial value for object types', () => {
      const obj = { key: 'value' };
      const { result } = renderHook(() => useDebounce(obj, 200));

      expect(result.current).toBe(obj);
    });
  });

  describe('value settles after delay', () => {
    it('should update the debounced value after the full delay elapses', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) =>
          useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } },
      );

      // Change value
      rerender({ value: 'updated', delay: 500 });

      // Before delay — still holds old value
      expect(result.current).toBe('initial');

      // Advance past the delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Now the debounced value should have settled
      expect(result.current).toBe('updated');
    });

    it('should not update before the delay has fully elapsed', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 1000),
        { initialProps: { value: 'first' } },
      );

      rerender({ value: 'second' });

      // Advance only partially
      act(() => {
        vi.advanceTimersByTime(999);
      });

      expect(result.current).toBe('first');

      // Advance the final millisecond
      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current).toBe('second');
    });

    it('should work with number values', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: number }) => useDebounce(value, 300),
        { initialProps: { value: 1 } },
      );

      rerender({ value: 99 });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe(99);
    });

    it('should use the default delay of 500ms when no delay is provided', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value),
        { initialProps: { value: 'start' } },
      );

      rerender({ value: 'end' });

      // Should NOT have updated at 499ms
      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(result.current).toBe('start');

      // Should update at exactly 500ms
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('end');
    });
  });

  describe('intermediate values are not emitted', () => {
    it('should only emit the last value after the delay, discarding intermediate updates', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 500),
        { initialProps: { value: 'start' } },
      );

      // Fire multiple rapid updates
      rerender({ value: 'a' });
      act(() => { vi.advanceTimersByTime(100); });

      rerender({ value: 'b' });
      act(() => { vi.advanceTimersByTime(100); });

      rerender({ value: 'c' });
      act(() => { vi.advanceTimersByTime(100); });

      // After 300ms total the debounced value is still the original
      expect(result.current).toBe('start');

      // Advance past the final 500ms window (200ms more)
      act(() => { vi.advanceTimersByTime(400); });

      // Only 'c' (the last value) should emerge — no 'a' or 'b' were emitted
      expect(result.current).toBe('c');
    });

    it('should cancel earlier timers when a new value arrives before delay elapses', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 300),
        { initialProps: { value: 'first' } },
      );

      // Update once and advance 200ms (timer not yet fired)
      rerender({ value: 'second' });
      act(() => { vi.advanceTimersByTime(200); });

      // Update again — this should cancel the 'second' timer
      rerender({ value: 'third' });
      act(() => { vi.advanceTimersByTime(200); });

      // Still not 300ms since 'third' arrived — should still be 'first'
      expect(result.current).toBe('first');

      // Complete the timer for 'third'
      act(() => { vi.advanceTimersByTime(100); });

      // Only 'third' is emitted; 'second' was never settled
      expect(result.current).toBe('third');
    });

    it('should emit each value when updates are spaced further apart than the delay', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 200),
        { initialProps: { value: 'first' } },
      );

      // First update — settle it fully
      rerender({ value: 'second' });
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current).toBe('second');

      // Second update — settle it fully
      rerender({ value: 'third' });
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current).toBe('third');
    });
  });

  describe('delay of 0 resolves immediately', () => {
    it('should resolve after 0ms when delay is 0', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 0),
        { initialProps: { value: 'initial' } },
      );

      rerender({ value: 'immediate' });

      // The setTimeout(fn, 0) callback fires after the current event loop tick.
      // advanceTimersByTime(0) flushes all zero-delay timers.
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('immediate');
    });

    it('should not update synchronously before timers are advanced, even with delay 0', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 0),
        { initialProps: { value: 'start' } },
      );

      rerender({ value: 'end' });

      // Before advancing timers the hook has not yet settled
      expect(result.current).toBe('start');
    });
  });

  describe('delay changes', () => {
    it('should respect the updated delay when delay prop changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }: { value: string; delay: number }) =>
          useDebounce(value, delay),
        { initialProps: { value: 'a', delay: 500 } },
      );

      // Change both value and delay simultaneously
      rerender({ value: 'b', delay: 100 });

      // With a 100ms delay, advancing 100ms should settle the value
      act(() => { vi.advanceTimersByTime(100); });

      expect(result.current).toBe('b');
    });
  });

  describe('value unchanged — no unnecessary re-trigger', () => {
    it('should retain the current value if re-rendered with the same value before delay elapses', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 500),
        { initialProps: { value: 'stable' } },
      );

      // Re-render with the same value — timer should reset but outcome is the same
      rerender({ value: 'stable' });

      act(() => { vi.advanceTimersByTime(500); });

      expect(result.current).toBe('stable');
    });
  });
});
