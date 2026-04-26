package services

import (
	"fmt"
	"sync"
	"time"

	"github.com/tether-erp/models"
)

// CacheService provides in-memory caching for frequently accessed data
type CacheService struct {
	cache map[string]*CacheItem
	mutex sync.RWMutex
	ttl   time.Duration
}

// CacheItem represents a cached item with expiration
type CacheItem struct {
	Data      interface{}
	ExpiresAt time.Time
}

// NewCacheService creates a new cache service
func NewCacheService(ttl time.Duration) *CacheService {
	service := &CacheService{
		cache: make(map[string]*CacheItem),
		ttl:   ttl,
	}
	
	// Start cleanup goroutine
	go service.cleanup()
	
	return service
}

// Get retrieves an item from cache
func (c *CacheService) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	item, exists := c.cache[key]
	if !exists {
		return nil, false
	}
	
	if time.Now().After(item.ExpiresAt) {
		delete(c.cache, key)
		return nil, false
	}
	
	return item.Data, true
}

// Set stores an item in cache
func (c *CacheService) Set(key string, data interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.cache[key] = &CacheItem{
		Data:      data,
		ExpiresAt: time.Now().Add(c.ttl),
	}
}

// Delete removes an item from cache
func (c *CacheService) Delete(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	delete(c.cache, key)
}

// Clear removes all items from cache
func (c *CacheService) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.cache = make(map[string]*CacheItem)
}

// cleanup removes expired items periodically
func (c *CacheService) cleanup() {
	ticker := time.NewTicker(time.Minute * 5)
	defer ticker.Stop()
	
	for range ticker.C {
		c.mutex.Lock()
		now := time.Now()
		for key, item := range c.cache {
			if now.After(item.ExpiresAt) {
				delete(c.cache, key)
			}
		}
		c.mutex.Unlock()
	}
}

// Cache key generators
func (c *CacheService) UserOrganizationsKey(userID string) string {
	return fmt.Sprintf("user_orgs:%s", userID)
}

func (c *CacheService) AnalyticsKey(orgID string, params string) string {
	return fmt.Sprintf("analytics:%s:%s", orgID, params)
}

func (c *CacheService) OrganizationMembersKey(orgID string) string {
	return fmt.Sprintf("org_members:%s", orgID)
}

// Cached methods for common operations
func (c *CacheService) GetUserOrganizations(userID string, fetchFunc func() ([]models.Organization, error)) ([]models.Organization, error) {
	key := c.UserOrganizationsKey(userID)
	
	if cached, found := c.Get(key); found {
		if orgs, ok := cached.([]models.Organization); ok {
			return orgs, nil
		}
	}
	
	orgs, err := fetchFunc()
	if err != nil {
		return nil, err
	}
	
	c.Set(key, orgs)
	return orgs, nil
}

// InvalidateUserCache removes user-related cache entries
func (c *CacheService) InvalidateUserCache(userID string) {
	c.Delete(c.UserOrganizationsKey(userID))
}

// InvalidateOrganizationCache removes organization-related cache entries
func (c *CacheService) InvalidateOrganizationCache(orgID string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	// Remove all analytics cache for this org + the org members key,
	// all under the single lock to avoid a recursive-lock deadlock.
	membersKey := c.OrganizationMembersKey(orgID)
	for key := range c.cache {
		if key == membersKey {
			delete(c.cache, key)
			continue
		}
		if len(key) > 10 && key[:10] == "analytics:" &&
			len(key) > len(orgID)+11 && key[10:10+len(orgID)] == orgID {
			delete(c.cache, key)
		}
	}
}