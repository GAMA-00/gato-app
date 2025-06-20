
import { imageMemoryCache } from './imageCache';
import { categoryImageUrls } from '@/constants/categoryConstants';
import {
  homeServiceImages,
  petsServiceImages,
  classesServiceImages,
  personalCareServiceImages,
  sportsServiceImages,
  otherServiceImages
} from '@/constants/serviceImages';

type PreloadPriority = 'critical' | 'high' | 'medium' | 'low';

interface PreloadTask {
  url: string;
  priority: PreloadPriority;
  delay?: number;
}

class SmartPreloader {
  private preloadQueue: PreloadTask[] = [];
  private isProcessing = false;
  private preloadedUrls = new Set<string>();

  async preloadByPriority(tasks: PreloadTask[]): Promise<void> {
    // Sort by priority and add to queue
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.preloadQueue.push(...sortedTasks);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const task = this.preloadQueue.shift()!;
      
      if (this.preloadedUrls.has(task.url)) {
        continue;
      }

      try {
        // Add delay for non-critical tasks
        if (task.delay && task.priority !== 'critical') {
          await new Promise(resolve => setTimeout(resolve, task.delay));
        }

        await this.preloadImage(task.url, task.priority);
        this.preloadedUrls.add(task.url);
        
        console.log(`✅ Preloaded (${task.priority}): ${task.url}`);
      } catch (error) {
        console.warn(`❌ Failed to preload: ${task.url}`, error);
      }
    }

    this.isProcessing = false;
  }

  private async preloadImage(url: string, priority: PreloadPriority): Promise<void> {
    // Check memory cache first
    const cached = await imageMemoryCache.get(url);
    if (cached) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      await imageMemoryCache.set(url, blob, priority);
    } catch (error) {
      throw new Error(`Failed to preload ${url}: ${error}`);
    }
  }

  preloadCriticalCategories(): void {
    const criticalTasks: PreloadTask[] = Object.entries(categoryImageUrls)
      .slice(0, 4) // First 4 categories
      .map(([, url]) => ({
        url,
        priority: 'critical' as const
      }));

    this.preloadByPriority(criticalTasks);
  }

  preloadCategoryServices(categoryName: string): void {
    const serviceImageMaps = {
      'home': homeServiceImages,
      'pets': petsServiceImages,
      'classes': classesServiceImages,
      'personal-care': personalCareServiceImages,
      'sports': sportsServiceImages,
      'other': otherServiceImages,
    };

    const serviceImages = serviceImageMaps[categoryName as keyof typeof serviceImageMaps];
    if (!serviceImages) return;

    const tasks: PreloadTask[] = Object.values(serviceImages).map(url => ({
      url,
      priority: 'high' as const,
      delay: 1000 // 1s delay
    }));

    this.preloadByPriority(tasks);
  }

  preloadRemainingImages(): void {
    // Preload remaining category images
    const remainingCategories = Object.entries(categoryImageUrls)
      .slice(4)
      .map(([, url]) => ({
        url,
        priority: 'medium' as const,
        delay: 2000
      }));

    // Preload all service images at low priority
    const allServiceImages = [
      ...Object.values(homeServiceImages),
      ...Object.values(petsServiceImages),
      ...Object.values(classesServiceImages),
      ...Object.values(personalCareServiceImages),
      ...Object.values(sportsServiceImages),
      ...Object.values(otherServiceImages),
    ].map(url => ({
      url,
      priority: 'low' as const,
      delay: 5000
    }));

    this.preloadByPriority([...remainingCategories, ...allServiceImages]);
  }

  getStats() {
    return {
      preloadedCount: this.preloadedUrls.size,
      queueLength: this.preloadQueue.length,
      isProcessing: this.isProcessing,
      memoryCache: imageMemoryCache.getStats()
    };
  }
}

export const smartPreloader = new SmartPreloader();
