package session

import "context"

// Store is a minimal session store interface.
//
// Implementations may apply TTL semantics; callers should treat Get/Exists as
// "only valid for non-expired sessions".
type Store interface {
	Set(ctx context.Context, sessionID string, data any) error
	Get(ctx context.Context, sessionID string) (any, bool, error)
	Del(ctx context.Context, sessionID string) error
	Exists(ctx context.Context, sessionID string) (bool, error)
}
