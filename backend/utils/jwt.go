package utils

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// CustomClaims represents JWT claims
type CustomClaims struct {
	UserID       string `json:"sub"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	CurrentOrgID string `json:"currentOrgId,omitempty"` // Current organization ID
	jwt.RegisteredClaims
	// JTI (JWT ID) is in RegisteredClaims.ID for token revocation
}

// TokenInfo holds information about a generated token
type TokenInfo struct {
	Token     string    `json:"token"`
	JTI       string    `json:"jti"`    // JWT ID for revocation
	Subject   string    `json:"subject"`
	IssuedAt  time.Time `json:"issuedAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// GenerateToken generates a new JWT token
func GenerateToken(userID, email, name, role string, currentOrgID *string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET not configured")
	}

	orgID := ""
	if currentOrgID != nil {
		orgID = *currentOrgID
	}

	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)

	claims := CustomClaims{
		UserID:       userID,
		Email:        email,
		Name:         name,
		Role:         role,
		CurrentOrgID: orgID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tether-erp",
			Subject:   userID,
			ID:        uuid.New().String(), // JTI (JWT ID) for token revocation
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))

	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token
func ValidateToken(tokenString string) (*CustomClaims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET not configured")
	}

	claims := &CustomClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %v", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// RefreshToken generates a new token from existing claims
func RefreshToken(claims *CustomClaims) (string, error) {
	claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(24 * time.Hour))
	claims.IssuedAt = jwt.NewNumericDate(time.Now())

	var orgID *string
	if claims.CurrentOrgID != "" {
		orgID = &claims.CurrentOrgID
	}

	return GenerateToken(claims.UserID, claims.Email, claims.Name, claims.Role, orgID)
}

// GenerateTokenWithInfo generates a token and returns token info including JTI
func GenerateTokenWithInfo(userID, email, name, role string, currentOrgID *string) (*TokenInfo, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET not configured")
	}

	orgID := ""
	if currentOrgID != nil {
		orgID = *currentOrgID
	}

	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)
	jti := uuid.New().String()

	claims := CustomClaims{
		UserID:       userID,
		Email:        email,
		Name:         name,
		Role:         role,
		CurrentOrgID: orgID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tether-erp",
			Subject:   userID,
			ID:        jti, // JTI (JWT ID) for token revocation
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign token: %v", err)
	}

	return &TokenInfo{
		Token:     tokenString,
		JTI:       jti,
		Subject:   userID,
		IssuedAt:  now,
		ExpiresAt: expiresAt,
	}, nil
}

// GenerateUserID generates a unique user ID
func GenerateUserID() string {
	return uuid.New().String()
}
