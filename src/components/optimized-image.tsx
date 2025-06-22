/**
 * Optimized Image Component
 * 
 * Advanced image optimization with lazy loading, preloading, and performance monitoring
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoadingComplete?: () => void;
  onError?: () => void;
  sizes?: string;
  fill?: boolean;
  eager?: boolean;
  preload?: boolean;
  webpFallback?: boolean;
  monitor?: boolean;
}

interface ImagePerformanceData {
  src: string;
  loadTime: number;
  size: number;
  format: string;
  cached: boolean;
  timestamp: number;
}

class ImagePerformanceMonitor {
  private static metrics: ImagePerformanceData[] = [];
  private static observers: ((data: ImagePerformanceData) => void)[] = [];

  static addMetric(data: ImagePerformanceData) {
    this.metrics.push(data);
    
    // Keep only last 100 entries
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Notify observers
    this.observers.forEach(observer => observer(data));

    // Log slow loading images in development
    if (process.env.NODE_ENV === 'development' && data.loadTime > 2000) {
      console.warn(`[Image] Slow loading image: ${data.src} took ${data.loadTime}ms`);
    }
  }

  static subscribe(callback: (data: ImagePerformanceData) => void) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  static getMetrics() {
    return this.metrics;
  }

  static getAverageLoadTime() {
    if (this.metrics.length === 0) return 0;
    const totalTime = this.metrics.reduce((sum, metric) => sum + metric.loadTime, 0);
    return totalTime / this.metrics.length;
  }

  static getCacheHitRate() {
    if (this.metrics.length === 0) return 0;
    const cachedImages = this.metrics.filter(metric => metric.cached).length;
    return (cachedImages / this.metrics.length) * 100;
  }

  static getSlowestImages(limit = 10) {
    return [...this.metrics]
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, limit);
  }
}

/**
 * Image preloader utility
 */
class ImagePreloader {
  private static preloadedImages = new Set<string>();
  private static preloadQueue: string[] = [];
  private static isProcessing = false;

  static preload(src: string, priority = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedImages.has(src)) {
        resolve();
        return;
      }

      if (typeof window === 'undefined') return;
      
      const img = new (window as any).Image();
      const startTime = performance.now();

      img.onload = () => {
        const loadTime = performance.now() - startTime;
        this.preloadedImages.add(src);
        
        // Monitor performance
        ImagePerformanceMonitor.addMetric({
          src,
          loadTime,
          size: 0, // We can't easily get size from Image object
          format: this.getImageFormat(src),
          cached: loadTime < 50, // Assume cached if very fast
          timestamp: Date.now(),
        });

        resolve();
      };

      img.onerror = () => {
        reject(new Error(`Failed to preload image: ${src}`));
      };

      img.src = src;
    });
  }

  static async preloadBatch(srcs: string[], maxConcurrent = 3) {
    const batches: string[][] = [];
    for (let i = 0; i < srcs.length; i += maxConcurrent) {
      batches.push(srcs.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(src => this.preload(src))
      );
    }
  }

  static queue(src: string) {
    if (!this.preloadedImages.has(src) && !this.preloadQueue.includes(src)) {
      this.preloadQueue.push(src);
      this.processQueue();
    }
  }

  private static async processQueue() {
    if (this.isProcessing || this.preloadQueue.length === 0) return;

    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const src = this.preloadQueue.shift()!;
      try {
        await this.preload(src);
      } catch (error) {
        console.warn('[Image Preloader] Failed to preload:', src, error);
      }
    }

    this.isProcessing = false;
  }

  private static getImageFormat(src: string): string {
    const extension = src.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  static isPreloaded(src: string) {
    return this.preloadedImages.has(src);
  }

  static clearCache() {
    this.preloadedImages.clear();
    this.preloadQueue.length = 0;
  }
}

/**
 * Enhanced image component with optimization features
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onLoadingComplete,
  onError,
  sizes,
  fill = false,
  eager = false,
  preload = false,
  webpFallback = true,
  monitor = true,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadTime, setLoadTime] = useState(0);
  const loadStartTime = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement>(null);

  // Preload image if requested
  useEffect(() => {
    if (preload && !priority) {
      ImagePreloader.queue(src);
    }
  }, [src, preload, priority]);

  // Monitor intersection for lazy loading optimization
  useEffect(() => {
    if (!imageRef.current || priority || eager) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is about to be visible, preload it
            ImagePreloader.queue(src);
          }
        });
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    );

    observer.observe(imageRef.current);

    return () => observer.disconnect();
  }, [src, priority, eager]);

  const handleLoadStart = useCallback(() => {
    loadStartTime.current = performance.now();
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadComplete = useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - loadStartTime.current;
    
    setLoadTime(duration);
    setIsLoading(false);
    
    // Monitor performance if enabled
    if (monitor) {
      ImagePerformanceMonitor.addMetric({
        src,
        loadTime: duration,
        size: 0, // Would need additional logic to determine size
        format: src.split('.').pop()?.toLowerCase() || 'unknown',
        cached: duration < 50, // Assume cached if very fast
        timestamp: Date.now(),
      });
    }

    onLoadingComplete?.();
  }, [src, monitor, onLoadingComplete]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate optimized src with format detection
  const optimizedSrc = useMemo(() => {
    if (typeof window === 'undefined') return src;

    // Check WebP support
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    // Return WebP version if supported and fallback enabled
    if (webpFallback && supportsWebP && !src.endsWith('.webp')) {
      return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    return src;
  }, [src, webpFallback]);

  // Error fallback component
  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-400 text-sm",
          className
        )}
        style={{ width, height }}
      >
        <span>Failed to load image</span>
      </div>
    );
  }

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <div 
      className={cn(
        "animate-pulse bg-gray-200 flex items-center justify-center",
        className
      )}
      style={{ width, height }}
    >
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="relative">
      {isLoading && placeholder === 'empty' && <LoadingPlaceholder />}
      
      <Image
        ref={imageRef}
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoadStart={handleLoadStart}
        onLoad={handleLoadComplete}
        onError={handleError}
        {...props}
      />

      {/* Performance indicator in development */}
      {process.env.NODE_ENV === 'development' && monitor && loadTime > 0 && (
        <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-bl">
          {loadTime.toFixed(0)}ms
        </div>
      )}
    </div>
  );
}

/**
 * Image gallery with intelligent preloading
 */
interface OptimizedImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  className?: string;
  preloadNext?: number;
  lazyLoad?: boolean;
}

export function OptimizedImageGallery({
  images,
  className,
  preloadNext = 3,
  lazyLoad = true,
}: OptimizedImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Preload next images
  useEffect(() => {
    const nextImages = images
      .slice(currentIndex + 1, currentIndex + 1 + preloadNext)
      .map(img => img.src);

    ImagePreloader.preloadBatch(nextImages);
  }, [currentIndex, images, preloadNext]);

  return (
    <div className={cn("grid gap-4", className)}>
      {images.map((image, index) => (
        <OptimizedImage
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority={index === 0}
          preload={index <= preloadNext}
          eager={!lazyLoad || index <= 2}
          className="rounded-lg"
        />
      ))}
    </div>
  );
}

/**
 * Performance monitoring hook
 */
export function useImagePerformance() {
  const [metrics, setMetrics] = useState<ImagePerformanceData[]>([]);

  useEffect(() => {
    const unsubscribe = ImagePerformanceMonitor.subscribe((data) => {
      setMetrics(current => [...current, data]);
    });

    // Initial data
    setMetrics(ImagePerformanceMonitor.getMetrics());

    return unsubscribe;
  }, []);

  const stats = useMemo(() => ({
    totalImages: metrics.length,
    averageLoadTime: ImagePerformanceMonitor.getAverageLoadTime(),
    cacheHitRate: ImagePerformanceMonitor.getCacheHitRate(),
    slowestImages: ImagePerformanceMonitor.getSlowestImages(5),
  }), [metrics]);

  return { metrics, stats };
}

/**
 * Image preloader hook
 */
export function useImagePreloader() {
  const preload = useCallback((src: string) => {
    return ImagePreloader.preload(src);
  }, []);

  const preloadBatch = useCallback((srcs: string[]) => {
    return ImagePreloader.preloadBatch(srcs);
  }, []);

  const isPreloaded = useCallback((src: string) => {
    return ImagePreloader.isPreloaded(src);
  }, []);

  return { preload, preloadBatch, isPreloaded };
}

// Export performance monitor and preloader for advanced usage
export { ImagePerformanceMonitor, ImagePreloader };