package utils

import (
	"crypto/sha256"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost is the cost factor for bcrypt hashing
	BcryptCost = bcrypt.DefaultCost
)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	if password == "" {
		return "", fmt.Errorf("password cannot be empty")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		return "", fmt.Errorf("failed to hash password: %v", err)
	}

	return string(hashedPassword), nil
}

// VerifyPassword verifies a password against its hash
func VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// ValidatePasswordStrength checks if password meets minimum requirements
func ValidatePasswordStrength(password string) error {
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	// Check for at least one uppercase letter
	hasUpper := false
	hasLower := false
	hasDigit := false

	for _, char := range password {
		if char >= 'A' && char <= 'Z' {
			hasUpper = true
		}
		if char >= 'a' && char <= 'z' {
			hasLower = true
		}
		if char >= '0' && char <= '9' {
			hasDigit = true
		}
	}

	if !hasUpper {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}

	if !hasLower {
		return fmt.Errorf("password must contain at least one lowercase letter")
	}

	if !hasDigit {
		return fmt.Errorf("password must contain at least one digit")
	}

	return nil
}

// HashEmail creates a SHA256 hash of an email for secure logging
// This allows logging email-related events without exposing actual email addresses
func HashEmail(email string) string {
	if email == "" {
		return ""
	}
	
	hash := sha256.Sum256([]byte(email))
	return fmt.Sprintf("%x", hash)[:16] // Return first 16 characters for brevity
}
