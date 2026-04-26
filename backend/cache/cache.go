package cache

import (
	"sync"
	"time"
)

// CacheItem represents a cached item with expiration
type cacheItem struct {
	Value      interface{}
	Expiration time.Time
}

// Cache represents an in-memory cache with TTL support
type Cache struct {
	items map[string]cacheItem
	mu    sync.RWMutex
}

// NewCache creates a new cache instance
func NewCache() *Cache {
	c := &Cache{
		items: make(map[string]cacheItem),
	}
	
	// Start cleanup goroutine
	go c.cleanupExpired()
	
	return c
}

// Get retrieves a value from the cache
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, found := c.items[key]
	if !found {
		return nil, false
	}

	// Check if expired
	if time.Now().After(item.Expiration) {
		return nil, false
	}

	return item.Value, true
}

// Set stores a value in the cache with TTL
func (c *Cache) Set(key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = cacheItem{
		Value:      value,
		Expiration: time.Now().Add(ttl),
	}
}

// Delete removes a value from the cache
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.items, key)
}

// Clear removes a specific key from the cache
func (c *Cache) Clear(key string) {
	c.Delete(key)
}

// ClearPrefix removes all keys with a specific prefix
func (c *Cache) ClearPrefix(prefix string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	keysToDelete := []string{}
	for key := range c.items {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			keysToDelete = append(keysToDelete, key)
		}
	}

	for _, key := range keysToDelete {
		delete(c.items, key)
	}
}

// ClearAll removes all items from the cache
func (c *Cache) ClearAll() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]cacheItem)
}

// Size returns the number of items in the cache
func (c *Cache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return len(c.items)
}

// cleanupExpired removes expired items periodically
func (c *Cache) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, item := range c.items {
			if now.After(item.Expiration) {
				delete(c.items, key)
			}
		}
		c.mu.Unlock()
	}
}

// Global cache instance
var globalCache *Cache
var once sync.Once

// GetCache returns the global cache instance (singleton)
func GetCache() *Cache {
	once.Do(func() {
		globalCache = NewCache()
	})
	return globalCache
}
