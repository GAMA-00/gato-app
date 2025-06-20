
interface CacheEntry {
  blob: Blob;
  timestamp: number;
  url: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

class ImageMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize = 50 * 1024 * 1024; // 50MB
  private readonly maxEntries = 200;
  private readonly ttl = 30 * 60 * 1000; // 30 minutes

  async get(url: string): Promise<string | null> {
    const entry = this.cache.get(url);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(url);
      return null;
    }
    
    // Return blob URL
    return URL.createObjectURL(entry.blob);
  }

  async set(url: string, blob: Blob, priority: CacheEntry['priority'] = 'medium'): Promise<void> {
    // Clean up if needed
    this.cleanup();
    
    const entry: CacheEntry = {
      blob,
      timestamp: Date.now(),
      url,
      priority
    };
    
    this.cache.set(url, entry);
  }

  private cleanup(): void {
    // Remove expired entries
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(url);
      }
    }
    
    // If still over limits, remove oldest low-priority entries
    if (this.cache.size > this.maxEntries) {
      const entries = Array.from(this.cache.entries());
      const lowPriority = entries
        .filter(([, entry]) => entry.priority === 'low')
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
      for (let i = 0; i < lowPriority.length && this.cache.size > this.maxEntries; i++) {
        this.cache.delete(lowPriority[i][0]);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      hitRate: 0, // Could implement hit tracking
      memoryUsage: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.blob.size, 0)
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const imageMemoryCache = new ImageMemoryCache();
