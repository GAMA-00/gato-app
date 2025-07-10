
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
  private concurrentLimit = 4; // Limite de descargas concurrentes

  // Check if we're on a route that needs category images
  private shouldPreloadCategories(): boolean {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return path.includes('/client') && !path.includes('/login');
  }

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

    // Procesar tareas críticas inmediatamente sin delay
    const criticalTasks = this.preloadQueue.filter(task => task.priority === 'critical');
    const otherTasks = this.preloadQueue.filter(task => task.priority !== 'critical');
    
    // Procesar críticas concurrentemente
    if (criticalTasks.length > 0) {
      await this.processConcurrent(criticalTasks);
    }
    
    // Procesar el resto con delays apropiados
    for (const task of otherTasks) {
      if (this.preloadedUrls.has(task.url)) continue;

      try {
        if (task.delay && task.priority !== 'high') {
          await new Promise(resolve => setTimeout(resolve, task.delay));
        }

        await this.preloadImage(task.url, task.priority);
        this.preloadedUrls.add(task.url);
        
        console.log(`✅ Preloaded (${task.priority}): ${task.url}`);
      } catch (error) {
        console.warn(`❌ Failed to preload: ${task.url}`, error);
      }
    }

    this.preloadQueue = [];
    this.isProcessing = false;
  }

  private async processConcurrent(tasks: PreloadTask[]): Promise<void> {
    const chunks = [];
    for (let i = 0; i < tasks.length; i += this.concurrentLimit) {
      chunks.push(tasks.slice(i, i + this.concurrentLimit));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (task) => {
        if (this.preloadedUrls.has(task.url)) return;
        
        try {
          await this.preloadImage(task.url, task.priority);
          this.preloadedUrls.add(task.url);
          console.log(`✅ Critical preloaded: ${task.url}`);
        } catch (error) {
          console.warn(`❌ Failed critical preload: ${task.url}`, error);
        }
      });

      await Promise.allSettled(promises);
    }
  }

  private async preloadImage(url: string, priority: PreloadPriority): Promise<void> {
    // Check memory cache first
    const cached = await imageMemoryCache.get(url);
    if (cached) return;

    try {
      const response = await fetch(url, {
        mode: 'cors',
        cache: 'force-cache' // Forzar uso de cache del navegador
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      await imageMemoryCache.set(url, blob, priority);
    } catch (error) {
      throw new Error(`Failed to preload ${url}: ${error}`);
    }
  }

  preloadCriticalCategories(): void {
    // Only preload if we're on a route that needs categories
    if (!this.shouldPreloadCategories()) {
      console.log('Skipping category preload - not on client route');
      return;
    }

    const criticalCategories = ['home', 'pets', 'classes', 'personal-care'];
    const criticalTasks: PreloadTask[] = criticalCategories.map(categoryName => ({
      url: categoryImageUrls[categoryName],
      priority: 'critical' as const
    }));

    console.log('Starting critical category preload');
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
      delay: 500 // Reducido de 1000ms
    }));

    this.preloadByPriority(tasks);
  }

  preloadRemainingImages(): void {
    // Only preload if we're on a route that needs categories
    if (!this.shouldPreloadCategories()) {
      console.log('Skipping remaining images preload - not on client route');
      return;
    }

    // Preload remaining category images
    const remainingCategories = Object.entries(categoryImageUrls)
      .filter(([categoryName]) => !['home', 'pets', 'classes', 'personal-care'].includes(categoryName))
      .map(([, url]) => ({
        url,
        priority: 'high' as const,
        delay: 1000
      }));

    // Preload all service images at medium priority with longer delays
    const allServiceImages = [
      ...Object.values(homeServiceImages),
      ...Object.values(petsServiceImages),
      ...Object.values(classesServiceImages),
      ...Object.values(personalCareServiceImages),
      ...Object.values(sportsServiceImages),
      ...Object.values(otherServiceImages),
    ].map((url, index) => ({
      url,
      priority: 'medium' as const,
      delay: 3000 + (index * 50) // Stagger the loads
    }));

    console.log('Starting remaining images preload');
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
