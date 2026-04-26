package circuit_test

import (
	"errors"
	"testing"
	"time"

	"github.com/tether-erp/bootstrap/circuit"
	"github.com/stretchr/testify/assert"
)

func TestCircuitBreakerClosed(t *testing.T) {
	config := circuit.Config{
		MaxFailures: 3,
		Timeout:     time.Second,
		Interval:    time.Second,
	}
	
	breaker := circuit.NewBreaker(config)
	
	// Should start in closed state
	assert.Equal(t, "CLOSED", breaker.State())
	assert.Equal(t, 0, breaker.Failures())
	
	// Successful execution should work
	err := breaker.Execute(func() error {
		return nil
	})
	assert.NoError(t, err)
	assert.Equal(t, "CLOSED", breaker.State())
}

func TestCircuitBreakerOpens(t *testing.T) {
	config := circuit.Config{
		MaxFailures: 2,
		Timeout:     time.Millisecond * 100,
		Interval:    time.Millisecond * 50,
	}
	
	breaker := circuit.NewBreaker(config)
	
	// Fail twice to reach threshold
	for i := 0; i < 2; i++ {
		err := breaker.Execute(func() error {
			return errors.New("test error")
		})
		assert.Error(t, err)
	}
	
	// Should now be open
	assert.Equal(t, "OPEN", breaker.State())
	assert.Equal(t, 2, breaker.Failures())
	
	// Next execution should fail immediately
	err := breaker.Execute(func() error {
		return nil // This shouldn't be called
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "circuit breaker is open")
}

func TestCircuitBreakerHalfOpen(t *testing.T) {
	config := circuit.Config{
		MaxFailures: 1,
		Timeout:     time.Millisecond * 50,
		Interval:    time.Millisecond * 25,
	}
	
	breaker := circuit.NewBreaker(config)
	
	// Fail once to open the circuit
	err := breaker.Execute(func() error {
		return errors.New("test error")
	})
	assert.Error(t, err)
	assert.Equal(t, "OPEN", breaker.State())
	
	// Wait for timeout
	time.Sleep(time.Millisecond * 60)
	
	// Next execution should transition to half-open
	err = breaker.Execute(func() error {
		return nil // Success
	})
	assert.NoError(t, err)
	assert.Equal(t, "CLOSED", breaker.State())
	assert.Equal(t, 0, breaker.Failures())
}

func TestCircuitBreakerReset(t *testing.T) {
	config := circuit.Config{
		MaxFailures: 1,
		Timeout:     time.Second,
		Interval:    time.Second,
	}
	
	breaker := circuit.NewBreaker(config)
	
	// Fail to open the circuit
	err := breaker.Execute(func() error {
		return errors.New("test error")
	})
	assert.Error(t, err)
	assert.Equal(t, "OPEN", breaker.State())
	
	// Reset manually
	breaker.Reset()
	assert.Equal(t, "CLOSED", breaker.State())
	assert.Equal(t, 0, breaker.Failures())
	
	// Should work normally now
	err = breaker.Execute(func() error {
		return nil
	})
	assert.NoError(t, err)
}