package circuit

import (
	"errors"
	"sync"
	"time"
)

// State represents the circuit breaker state
type State int

const (
	StateClosed State = iota
	StateHalfOpen
	StateOpen
)

func (s State) String() string {
	switch s {
	case StateClosed:
		return "CLOSED"
	case StateHalfOpen:
		return "HALF_OPEN"
	case StateOpen:
		return "OPEN"
	default:
		return "UNKNOWN"
	}
}

// Config holds circuit breaker configuration
type Config struct {
	MaxFailures int           // Maximum failures before opening
	Timeout     time.Duration // Timeout before attempting to close
	Interval    time.Duration // Interval for checking if circuit should close
}

// Breaker implements the circuit breaker pattern
type Breaker struct {
	config       Config
	state        State
	failures     int
	lastFailTime time.Time
	mutex        sync.RWMutex
}

// NewBreaker creates a new circuit breaker
func NewBreaker(config Config) *Breaker {
	return &Breaker{
		config: config,
		state:  StateClosed,
	}
}

// Execute runs the given function with circuit breaker protection
func (b *Breaker) Execute(fn func() error) error {
	if !b.canExecute() {
		return errors.New("circuit breaker is open")
	}

	err := fn()
	b.recordResult(err)
	return err
}

// canExecute determines if the function can be executed
func (b *Breaker) canExecute() bool {
	b.mutex.RLock()
	defer b.mutex.RUnlock()

	switch b.state {
	case StateClosed:
		return true
	case StateOpen:
		// Check if timeout has passed
		if time.Since(b.lastFailTime) > b.config.Timeout {
			// Transition to half-open
			b.mutex.RUnlock()
			b.mutex.Lock()
			if b.state == StateOpen && time.Since(b.lastFailTime) > b.config.Timeout {
				b.state = StateHalfOpen
			}
			b.mutex.Unlock()
			b.mutex.RLock()
			return b.state == StateHalfOpen
		}
		return false
	case StateHalfOpen:
		return true
	default:
		return false
	}
}

// recordResult records the result of function execution
func (b *Breaker) recordResult(err error) {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if err != nil {
		b.failures++
		b.lastFailTime = time.Now()

		switch b.state {
		case StateClosed:
			if b.failures >= b.config.MaxFailures {
				b.state = StateOpen
			}
		case StateHalfOpen:
			b.state = StateOpen
		}
	} else {
		// Success
		switch b.state {
		case StateHalfOpen:
			b.state = StateClosed
			b.failures = 0
		case StateClosed:
			// Reset failure count on success
			if b.failures > 0 {
				b.failures = 0
			}
		}
	}
}

// State returns the current state of the circuit breaker
func (b *Breaker) State() string {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.state.String()
}

// Failures returns the current failure count
func (b *Breaker) Failures() int {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.failures
}

// Reset manually resets the circuit breaker to closed state
func (b *Breaker) Reset() {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	b.state = StateClosed
	b.failures = 0
}