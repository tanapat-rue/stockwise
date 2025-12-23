package session

import (
	"context"
	"sync"
	"time"
)

type MemoryStore struct {
	ttl time.Duration

	mu    sync.RWMutex
	items map[string]memoryItem
}

type memoryItem struct {
	data      any
	expiresAt time.Time
}

func NewMemoryStore(ttl time.Duration) *MemoryStore {
	if ttl <= 0 {
		ttl = 7 * 24 * time.Hour
	}
	return &MemoryStore{
		ttl:   ttl,
		items: make(map[string]memoryItem),
	}
}

func (s *MemoryStore) Set(_ context.Context, sessionID string, data any) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	s.items[sessionID] = memoryItem{
		data:      data,
		expiresAt: time.Now().Add(s.ttl),
	}
	s.mu.Unlock()
	return nil
}

func (s *MemoryStore) Get(_ context.Context, sessionID string) (any, bool, error) {
	if s == nil {
		return nil, false, nil
	}

	s.mu.RLock()
	item, ok := s.items[sessionID]
	s.mu.RUnlock()

	if !ok {
		return nil, false, nil
	}
	if time.Now().After(item.expiresAt) {
		_ = s.Del(context.Background(), sessionID)
		return nil, false, nil
	}
	return item.data, true, nil
}

func (s *MemoryStore) Del(_ context.Context, sessionID string) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	delete(s.items, sessionID)
	s.mu.Unlock()
	return nil
}

func (s *MemoryStore) Exists(_ context.Context, sessionID string) (bool, error) {
	_, ok, _ := s.Get(context.Background(), sessionID)
	return ok, nil
}
