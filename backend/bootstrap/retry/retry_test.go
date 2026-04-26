package retry_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/tether-erp/bootstrap/retry"
	"github.com/stretchr/testify/assert"
)

func TestExponentialBackoffSuccess(t *testing.T) {
	attempts := 0
	err := retry.WithExponentialBackoff(
		context.Background(),
		3,
		time.Millisecond*10,
		func() error {
			attempts++
			if attempts < 2 {
				return errors.New("temporary error")
			}
			return nil
		},
	)
	
	assert.NoError(t, err)
	assert.Equal(t, 2, attempts)
}

func TestExponentialBackoffMaxAttempts(t *testing.T) {
	attempts := 0
	err := retry.WithExponentialBackoff(
		context.Background(),
		3,
		time.Millisecond*10,
		func() error {
			attempts++
			return errors.New("persistent error")
		},
	)
	
	assert.Error(t, err)
	assert.Equal(t, 3, attempts)
	assert.Contains(t, err.Error(), "max retry attempts")
}

func TestExponentialBackoffContextCancellation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*50)
	defer cancel()
	
	attempts := 0
	err := retry.WithExponentialBackoff(
		ctx,
		10,
		time.Millisecond*100, // Long delay to trigger timeout
		func() error {
			attempts++
			return errors.New("error")
		},
	)
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cancelled")
	assert.True(t, attempts <= 2) // Should not complete all attempts
}

func TestLinearBackoffSuccess(t *testing.T) {
	attempts := 0
	err := retry.WithLinearBackoff(
		context.Background(),
		3,
		time.Millisecond*10,
		func() error {
			attempts++
			if attempts < 3 {
				return errors.New("temporary error")
			}
			return nil
		},
	)
	
	assert.NoError(t, err)
	assert.Equal(t, 3, attempts)
}

func TestIsRetryable(t *testing.T) {
	testCases := []struct {
		err       error
		retryable bool
	}{
		{nil, false},
		{errors.New("connection refused"), true},
		{errors.New("timeout occurred"), true},
		{errors.New("duplicate key violation"), false},
		{errors.New("unique constraint failed"), false},
		{errors.New("syntax error"), false},
		{errors.New("unknown error"), true}, // Default to retryable
	}
	
	for _, tc := range testCases {
		result := retry.IsRetryable(tc.err)
		assert.Equal(t, tc.retryable, result, "Error: %v", tc.err)
	}
}