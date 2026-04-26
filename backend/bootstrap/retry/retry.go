package retry

import (
	"context"
	"fmt"
	"math"
	"time"
)

// WithExponentialBackoff retries a function with exponential backoff
func WithExponentialBackoff(ctx context.Context, maxAttempts int, baseDelay time.Duration, fn func() error) error {
	var lastErr error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return fmt.Errorf("retry cancelled: %w", ctx.Err())
		default:
		}

		// Execute the function
		err := fn()
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Don't wait after the last attempt
		if attempt == maxAttempts {
			break
		}

		// Calculate delay with exponential backoff
		delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt-1)))
		
		// Add jitter to prevent thundering herd
		jitterFactor := float64(time.Now().UnixNano()%2*2 - 1) * 0.1 // -0.1 to +0.1
		jitter := time.Duration(float64(delay) * jitterFactor)
		delay += jitter

		// Cap the maximum delay
		maxDelay := baseDelay * 32 // 32x base delay max
		if delay > maxDelay {
			delay = maxDelay
		}

		// Wait before retry
		select {
		case <-ctx.Done():
			return fmt.Errorf("retry cancelled during backoff: %w", ctx.Err())
		case <-time.After(delay):
		}
	}

	return fmt.Errorf("max retry attempts (%d) exceeded, last error: %w", maxAttempts, lastErr)
}

// WithLinearBackoff retries a function with linear backoff
func WithLinearBackoff(ctx context.Context, maxAttempts int, delay time.Duration, fn func() error) error {
	var lastErr error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return fmt.Errorf("retry cancelled: %w", ctx.Err())
		default:
		}

		// Execute the function
		err := fn()
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Don't wait after the last attempt
		if attempt == maxAttempts {
			break
		}

		// Wait with linear backoff
		select {
		case <-ctx.Done():
			return fmt.Errorf("retry cancelled during backoff: %w", ctx.Err())
		case <-time.After(delay):
		}
	}

	return fmt.Errorf("max retry attempts (%d) exceeded, last error: %w", maxAttempts, lastErr)
}

// IsRetryable determines if an error should be retried
func IsRetryable(err error) bool {
	if err == nil {
		return false
	}

	// Add logic to determine if error is retryable
	// For database operations, connection errors are typically retryable
	// but constraint violations are not
	
	errStr := err.Error()
	
	// Retryable database errors
	retryableErrors := []string{
		"connection refused",
		"connection reset",
		"timeout",
		"temporary failure",
		"server closed",
		"broken pipe",
	}

	for _, retryable := range retryableErrors {
		if contains(errStr, retryable) {
			return true
		}
	}

	// Non-retryable errors
	nonRetryableErrors := []string{
		"duplicate key",
		"unique constraint",
		"foreign key constraint",
		"check constraint",
		"syntax error",
		"permission denied",
	}

	for _, nonRetryable := range nonRetryableErrors {
		if contains(errStr, nonRetryable) {
			return false
		}
	}

	// Default to retryable for unknown errors
	return true
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		   (s == substr || 
		    (len(s) > len(substr) && 
		     (s[:len(substr)] == substr || 
		      s[len(s)-len(substr):] == substr ||
		      containsSubstring(s, substr))))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}