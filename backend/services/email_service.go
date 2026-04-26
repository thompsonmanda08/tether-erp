package services

import (
	"os"
)

// EmailService stubs outbound email delivery.
// Set EMAIL_ENABLED=true and configure SMTP/SendGrid env vars to enable real sends.
type EmailService struct {
	enabled bool
}

func NewEmailService() *EmailService {
	return &EmailService{
		enabled: os.Getenv("EMAIL_ENABLED") == "true",
	}
}
