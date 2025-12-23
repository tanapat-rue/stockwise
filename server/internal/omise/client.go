package omise

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	secretKey string
	http      *http.Client
	baseURL   string
}

func New(secretKey string) *Client {
	return &Client{
		secretKey: strings.TrimSpace(secretKey),
		http: &http.Client{
			Timeout: 20 * time.Second,
		},
		baseURL: "https://api.omise.co",
	}
}

type APIError struct {
	StatusCode int
	Message    string
	Body       string
}

func (e APIError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("omise: %s (status=%d)", e.Message, e.StatusCode)
	}
	return fmt.Sprintf("omise: request failed (status=%d)", e.StatusCode)
}

type Customer struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func (c *Client) CreateCustomer(ctx context.Context, email, description, cardToken string) (Customer, error) {
	if c == nil || c.secretKey == "" {
		return Customer{}, fmt.Errorf("omise: secret key not configured")
	}

	form := url.Values{}
	if strings.TrimSpace(email) != "" {
		form.Set("email", strings.TrimSpace(email))
	}
	if strings.TrimSpace(description) != "" {
		form.Set("description", strings.TrimSpace(description))
	}
	if strings.TrimSpace(cardToken) != "" {
		form.Set("card", strings.TrimSpace(cardToken))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/customers", strings.NewReader(form.Encode()))
	if err != nil {
		return Customer{}, err
	}
	req.SetBasicAuth(c.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return Customer{}, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		msg := extractOmiseMessage(body)
		return Customer{}, APIError{StatusCode: resp.StatusCode, Message: msg, Body: string(body)}
	}

	var out Customer
	if err := json.Unmarshal(body, &out); err != nil {
		return Customer{}, err
	}
	if out.ID == "" {
		return Customer{}, fmt.Errorf("omise: missing customer id")
	}
	return out, nil
}

func extractOmiseMessage(body []byte) string {
	// Omise error bodies usually include: { "message": "...", "code": "...", ... }
	var v map[string]any
	if err := json.Unmarshal(body, &v); err == nil {
		if msg, ok := v["message"].(string); ok {
			return msg
		}
	}
	return ""
}

type Charge struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// CreateCharge is a minimal helper to validate credentials/card setup.
// amount is in the smallest currency unit (e.g. THB satang).
func (c *Client) CreateCharge(ctx context.Context, amount int64, currency, customerID string) (Charge, error) {
	if c == nil || c.secretKey == "" {
		return Charge{}, fmt.Errorf("omise: secret key not configured")
	}
	if amount <= 0 {
		return Charge{}, fmt.Errorf("omise: amount must be > 0")
	}
	if strings.TrimSpace(currency) == "" {
		currency = "thb"
	}
	payload := url.Values{}
	payload.Set("amount", fmt.Sprintf("%d", amount))
	payload.Set("currency", strings.ToLower(strings.TrimSpace(currency)))
	if strings.TrimSpace(customerID) != "" {
		payload.Set("customer", strings.TrimSpace(customerID))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/charges", strings.NewReader(payload.Encode()))
	if err != nil {
		return Charge{}, err
	}
	req.SetBasicAuth(c.secretKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return Charge{}, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		msg := extractOmiseMessage(body)
		return Charge{}, APIError{StatusCode: resp.StatusCode, Message: msg, Body: string(body)}
	}

	var out Charge
	if err := json.Unmarshal(body, &out); err != nil {
		return Charge{}, err
	}
	if out.ID == "" {
		return Charge{}, fmt.Errorf("omise: missing charge id")
	}
	return out, nil
}

type WebhookEvent struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Data any    `json:"data"`
}

func (c *Client) VerifyWebhookSignature(_ *http.Request, _ string) bool {
	// Omise webhook verification is optional and implementation depends on Omise webhook signature headers.
	// This is left as a scaffold; use cfg.Omise.WebhookSecret and validate request headers here.
	return true
}

func PrettyJSON(v any) string {
	b, _ := json.MarshalIndent(v, "", "  ")
	return string(bytes.TrimSpace(b))
}

