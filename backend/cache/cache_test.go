package cache

import (
	"testing"
	"time"
)

func TestCache_SetAndGet(t *testing.T) {
	c := NewCache()

	// Test setting and getting a value
	c.Set("key1", "value1", 5*time.Minute)
	
	value, found := c.Get("key1")
	if !found {
		t.Error("Expected to find key1")
	}
	if value != "value1" {
		t.Errorf("Expected value1, got %v", value)
	}
}

func TestCache_GetNonExistent(t *testing.T) {
	c := NewCache()

	_, found := c.Get("nonexistent")
	if found {
		t.Error("Expected not to find nonexistent key")
	}
}

func TestCache_Expiration(t *testing.T) {
	c := NewCache()

	// Set with very short TTL
	c.Set("key1", "value1", 100*time.Millisecond)
	
	// Should exist immediately
	_, found := c.Get("key1")
	if !found {
		t.Error("Expected to find key1 immediately")
	}

	// Wait for expiration
	time.Sleep(150 * time.Millisecond)

	// Should not exist after expiration
	_, found = c.Get("key1")
	if found {
		t.Error("Expected key1 to be expired")
	}
}

func TestCache_Delete(t *testing.T) {
	c := NewCache()

	c.Set("key1", "value1", 5*time.Minute)
	c.Delete("key1")

	_, found := c.Get("key1")
	if found {
		t.Error("Expected key1 to be deleted")
	}
}

func TestCache_ClearPrefix(t *testing.T) {
	c := NewCache()

	c.Set("feature:org1:feat1", true, 5*time.Minute)
	c.Set("feature:org1:feat2", true, 5*time.Minute)
	c.Set("feature:org2:feat1", true, 5*time.Minute)
	c.Set("limits:org1", 100, 5*time.Minute)

	// Clear all feature: keys
	c.ClearPrefix("feature:")

	// feature: keys should be gone
	_, found := c.Get("feature:org1:feat1")
	if found {
		t.Error("Expected feature:org1:feat1 to be cleared")
	}

	// limits: key should still exist
	_, found = c.Get("limits:org1")
	if !found {
		t.Error("Expected limits:org1 to still exist")
	}
}

func TestCache_ClearAll(t *testing.T) {
	c := NewCache()

	c.Set("key1", "value1", 5*time.Minute)
	c.Set("key2", "value2", 5*time.Minute)
	c.Set("key3", "value3", 5*time.Minute)

	c.ClearAll()

	if c.Size() != 0 {
		t.Errorf("Expected cache to be empty, got size %d", c.Size())
	}
}

func TestCache_Size(t *testing.T) {
	c := NewCache()

	if c.Size() != 0 {
		t.Error("Expected empty cache")
	}

	c.Set("key1", "value1", 5*time.Minute)
	c.Set("key2", "value2", 5*time.Minute)

	if c.Size() != 2 {
		t.Errorf("Expected size 2, got %d", c.Size())
	}
}

func TestCache_ConcurrentAccess(t *testing.T) {
	c := NewCache()

	// Test concurrent writes
	done := make(chan bool)
	for i := 0; i < 100; i++ {
		go func(i int) {
			c.Set(string(rune(i)), i, 5*time.Minute)
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 100; i++ {
		<-done
	}

	// Test concurrent reads
	for i := 0; i < 100; i++ {
		go func(i int) {
			c.Get(string(rune(i)))
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 100; i++ {
		<-done
	}
}

func TestGetCache_Singleton(t *testing.T) {
	cache1 := GetCache()
	cache2 := GetCache()

	if cache1 != cache2 {
		t.Error("Expected GetCache to return the same instance")
	}
}
