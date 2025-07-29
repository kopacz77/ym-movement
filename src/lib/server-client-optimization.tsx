/**
 * Server/Client Component Optimization Strategy
 *
 * Intelligent optimization for Next.js App Router server and client components
 *
 * @version 3.0.0
 * @since Phase 3 Architecture Optimizations
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type React from "react";
import { cache, memo } from "react";

// Component classification system
export const ComponentTypes = {
  SERVER: "server",
  CLIENT: "client",
  HYBRID: "hybrid",
  STATIC: "static",
} as const;

type ComponentType = (typeof ComponentTypes)[keyof typeof ComponentTypes];

interface ComponentOptimizationRule {
  type: ComponentType;
  reasoning: string;
  optimizations: string[];
  cacheStrategy?: "static" | "dynamic" | "revalidate" | "force-dynamic";
  revalidateTime?: number;
}

/**
 * Component optimization analyzer
 */
export class ComponentOptimizer {
  private static rules: Map<string, ComponentOptimizationRule> = new Map();

  /**
   * Analyze component and provide optimization recommendations
   */
  static analyzeComponent(
    componentName: string,
    characteristics: {
      hasInteractivity: boolean;
      usesClientState: boolean;
      hasUserSpecificData: boolean;
      isDataHeavy: boolean;
      requiresSEO: boolean;
      hasFormHandling: boolean;
      usesThirdPartyScripts: boolean;
      isFrequentlyUpdated: boolean;
      hasRealTimeData: boolean;
    },
  ): ComponentOptimizationRule {
    const {
      hasInteractivity,
      usesClientState,
      hasUserSpecificData,
      isDataHeavy,
      requiresSEO,
      hasFormHandling,
      usesThirdPartyScripts,
      isFrequentlyUpdated,
      hasRealTimeData,
    } = characteristics;

    // Determine optimal component type
    let type: ComponentType;
    let reasoning: string;
    let optimizations: string[] = [];
    let cacheStrategy: ComponentOptimizationRule["cacheStrategy"];
    let revalidateTime: number | undefined;

    if (!hasInteractivity && !usesClientState && !hasUserSpecificData && !hasRealTimeData) {
      // Pure server component
      type = ComponentTypes.SERVER;
      reasoning = "No client-side interactivity or state, perfect for server rendering";
      cacheStrategy = isFrequentlyUpdated ? "revalidate" : "static";
      revalidateTime = isFrequentlyUpdated ? 300 : undefined; // 5 minutes
      optimizations = [
        "Use server component for faster initial load",
        "Implement data fetching at component level",
        "Cache data with appropriate revalidation strategy",
        "Optimize for SEO if required",
      ];
    } else if (hasInteractivity && !isDataHeavy && !requiresSEO) {
      // Pure client component
      type = ComponentTypes.CLIENT;
      reasoning = "High interactivity with minimal data requirements";
      optimizations = [
        "Use 'use client' directive",
        "Implement React.memo for re-render optimization",
        "Use useCallback and useMemo for expensive operations",
        "Consider code splitting for large interactive components",
      ];
    } else if ((hasInteractivity || usesClientState) && (isDataHeavy || requiresSEO)) {
      // Hybrid approach
      type = ComponentTypes.HYBRID;
      reasoning = "Needs both server-side data fetching and client-side interactivity";
      optimizations = [
        "Split into server wrapper + client interactive parts",
        "Server component handles data fetching and SEO",
        "Client component handles interactivity",
        "Use React Server Components composition pattern",
      ];
    } else {
      // Static component
      type = ComponentTypes.STATIC;
      reasoning = "Minimal interactivity, suitable for static generation";
      cacheStrategy = "static";
      optimizations = [
        "Generate statically at build time",
        "Use Next.js static optimization",
        "Implement proper caching headers",
      ];
    }

    // Add specific optimizations based on characteristics
    if (hasFormHandling) {
      optimizations.push("Use Server Actions for form handling");
      optimizations.push("Implement optimistic updates for better UX");
    }

    if (usesThirdPartyScripts) {
      optimizations.push("Use next/script with appropriate loading strategy");
      optimizations.push("Defer non-critical scripts");
    }

    if (hasUserSpecificData) {
      optimizations.push("Implement proper authentication checks");
      optimizations.push("Use dynamic rendering for user-specific content");
      cacheStrategy = "force-dynamic";
    }

    if (hasRealTimeData) {
      optimizations.push("Consider WebSocket or Server-Sent Events for real-time updates");
      optimizations.push("Implement data polling with SWR or React Query");
      cacheStrategy = "force-dynamic";
    }

    const rule: ComponentOptimizationRule = {
      type,
      reasoning,
      optimizations,
      cacheStrategy,
      revalidateTime,
    };

    ComponentOptimizer.rules.set(componentName, rule);
    return rule;
  }

  /**
   * Get optimization recommendations for existing component
   */
  static getRecommendations(componentName: string): ComponentOptimizationRule | null {
    return ComponentOptimizer.rules.get(componentName) || null;
  }

  /**
   * Generate component template based on optimization rules
   */
  static generateTemplate(componentName: string, rule: ComponentOptimizationRule): string {
    switch (rule.type) {
      case ComponentTypes.SERVER:
        return ComponentOptimizer.generateServerTemplate(componentName, rule);
      case ComponentTypes.CLIENT:
        return ComponentOptimizer.generateClientTemplate(componentName, rule);
      case ComponentTypes.HYBRID:
        return ComponentOptimizer.generateHybridTemplate(componentName, rule);
      case ComponentTypes.STATIC:
        return ComponentOptimizer.generateStaticTemplate(componentName, rule);
      default:
        return ComponentOptimizer.generateServerTemplate(componentName, rule);
    }
  }

  private static generateServerTemplate(
    componentName: string,
    rule: ComponentOptimizationRule,
  ): string {
    return `/**
 * ${componentName} - Server Component
 * 
 * ${rule.reasoning}
 * 
 * Optimizations applied:
 * ${rule.optimizations.map((opt) => ` * - ${opt}`).join("\n")}
 */

import { cache } from 'react';
import { notFound } from 'next/navigation';
${rule.cacheStrategy === "revalidate" ? `\n// Revalidate every ${rule.revalidateTime} seconds\nexport const revalidate = ${rule.revalidateTime};` : ""}
${rule.cacheStrategy === "force-dynamic" ? '\nexport const dynamic = "force-dynamic";' : ""}

// Cached data fetching function
const get${componentName}Data = cache(async (params: any) => {
  // Server-side data fetching logic
  try {
    const data = await fetchData(params);
    return data;
  } catch (error) {
    console.error('Error fetching ${componentName} data:', error);
    throw error;
  }
});

interface ${componentName}Props {
  // Define your props here
}

export default async function ${componentName}({ ...props }: ${componentName}Props) {
  try {
    const data = await get${componentName}Data(props);
    
    return (
      <div>
        {/* Server-rendered content */}
        {/* No client-side JavaScript needed */}
      </div>
    );
  } catch (error) {
    // Handle errors gracefully
    notFound();
  }
}

// Metadata generation for SEO
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const data = await get${componentName}Data(params);
  
  return {
    title: \`\${data.title} | Your App\`,
    description: data.description,
  };
}`;
  }

  private static generateClientTemplate(
    componentName: string,
    rule: ComponentOptimizationRule,
  ): string {
    return `/**
 * ${componentName} - Client Component
 * 
 * ${rule.reasoning}
 * 
 * Optimizations applied:
 * ${rule.optimizations.map((opt) => ` * - ${opt}`).join("\n")}
 */

"use client";

import React, { memo, useCallback, useMemo, useState } from 'react';
import { usePerformanceMonitor } from '@/lib/performance-monitor';

interface ${componentName}Props {
  // Define your props here
}

const ${componentName}Component: React.FC<${componentName}Props> = ({ ...props }) => {
  // Performance monitoring
  usePerformanceMonitor('${componentName}');

  // Local state management
  const [state, setState] = useState(initialState);

  // Memoized computations
  const computedValue = useMemo(() => {
    // Expensive computation here
    return expensiveComputation(props);
  }, [props]);

  // Optimized event handlers
  const handleAction = useCallback((event: Event) => {
    // Event handling logic
  }, []);

  return (
    <div>
      {/* Interactive client-side content */}
    </div>
  );
};

// Export memoized component
export const ${componentName} = memo(${componentName}Component);`;
  }

  private static generateHybridTemplate(
    componentName: string,
    rule: ComponentOptimizationRule,
  ): string {
    return `/**
 * ${componentName} - Hybrid Component (Server + Client)
 * 
 * ${rule.reasoning}
 * 
 * Optimizations applied:
 * ${rule.optimizations.map((opt) => ` * - ${opt}`).join("\n")}
 */

import { cache } from 'react';
import { ${componentName}Client } from './${componentName}Client';

// Server-side data fetching
const get${componentName}Data = cache(async (params: any) => {
  const data = await fetchData(params);
  return data;
});

interface ${componentName}Props {
  // Define your props here
}

// Server Component (wrapper)
export default async function ${componentName}({ ...props }: ${componentName}Props) {
  // Fetch data on server
  const serverData = await get${componentName}Data(props);
  
  return (
    <div>
      {/* Server-rendered SEO content */}
      <h1>{serverData.title}</h1>
      <meta name="description" content={serverData.description} />
      
      {/* Client-side interactive component */}
      <${componentName}Client 
        initialData={serverData}
        {...props}
      />
    </div>
  );
}

// Separate client component file: ${componentName}Client.tsx
/*
"use client";

import React, { memo } from 'react';

interface ${componentName}ClientProps {
  initialData: any;
  // Other props
}

const ${componentName}ClientComponent: React.FC<${componentName}ClientProps> = ({ 
  initialData, 
  ...props 
}) => {
  return (
    <div>
      {/* Interactive content using initialData */}
    </div>
  );
};

export const ${componentName}Client = memo(${componentName}ClientComponent);
*/`;
  }

  private static generateStaticTemplate(
    componentName: string,
    rule: ComponentOptimizationRule,
  ): string {
    return `/**
 * ${componentName} - Static Component
 * 
 * ${rule.reasoning}
 * 
 * Optimizations applied:
 * ${rule.optimizations.map((opt) => ` * - ${opt}`).join("\n")}
 */

// Force static generation
export const dynamic = 'force-static';

interface ${componentName}Props {
  // Define your props here
}

export default function ${componentName}({ ...props }: ${componentName}Props) {
  return (
    <div>
      {/* Static content */}
    </div>
  );
}

// Static generation at build time
export async function generateStaticParams() {
  // Return array of params for static generation
  return [];
}`;
  }
}

/**
 * Performance utilities for server/client optimization
 */
export class ServerClientPerformanceUtils {
  /**
   * Create cached server function with automatic revalidation
   */
  static createCachedFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      revalidate?: number;
      tags?: string[];
    } = {},
  ) {
    return cache(async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error("Cached function error:", error);
        throw error;
      }
    });
  }

  /**
   * Client-side component wrapper with performance monitoring
   */
  static withClientPerformance<P extends object>(
    Component: React.ComponentType<P>,
    componentName: string,
  ) {
    return memo((props: P) => {
      // This would be implemented in the actual component
      // usePerformanceMonitor(componentName);
      return <Component {...props} />;
    });
  }

  /**
   * Server component wrapper with error handling
   */
  static withServerErrorHandling<P extends object>(Component: React.ComponentType<P>) {
    return async (props: P) => {
      try {
        return await Component(props);
      } catch (error) {
        console.error("Server component error:", error);
        return <div>Error loading component</div>;
      }
    };
  }

  /**
   * Intelligent preloading strategy
   */
  static createPreloadStrategy(routes: string[]) {
    return {
      prefetchOnHover: routes.filter((route) => route.includes("/dashboard")),
      prefetchOnVisible: routes.filter((route) => route.includes("/profile")),
      prefetchOnIdle: routes.filter((route) => route.includes("/settings")),
    };
  }
}

/**
 * Component migration utilities
 */
export class ComponentMigrationUtils {
  /**
   * Analyze existing component for migration opportunities
   */
  static analyzeForMigration(componentCode: string): {
    canBeServerComponent: boolean;
    usesClientFeatures: string[];
    recommendations: string[];
  } {
    const clientFeatures = [
      "useState",
      "useEffect",
      "useCallback",
      "useMemo",
      "useRef",
      "onClick",
      "onChange",
      "addEventListener",
      "document.",
      "window.",
      "localStorage",
      "sessionStorage",
    ];

    const usedClientFeatures = clientFeatures.filter((feature) => componentCode.includes(feature));

    const canBeServerComponent = usedClientFeatures.length === 0;

    const recommendations: string[] = [];

    if (canBeServerComponent) {
      recommendations.push("✅ Can be converted to Server Component");
      recommendations.push("🚀 Remove 'use client' directive");
      recommendations.push("📦 Move data fetching to server");
    } else {
      recommendations.push("❌ Must remain Client Component");
      recommendations.push("🔧 Consider splitting into server + client parts");
      recommendations.push("⚡ Apply client optimization patterns");
    }

    if (componentCode.includes("fetch") || componentCode.includes("api.")) {
      recommendations.push("💡 Consider moving API calls to server");
    }

    if (componentCode.includes("SEO") || componentCode.includes("metadata")) {
      recommendations.push("🔍 Implement metadata generation");
    }

    return {
      canBeServerComponent,
      usesClientFeatures: usedClientFeatures,
      recommendations,
    };
  }

  /**
   * Generate migration plan
   */
  static generateMigrationPlan(
    componentName: string,
    analysis: ReturnType<typeof ComponentMigrationUtils.analyzeForMigration>,
  ): string[] {
    const plan: string[] = [];

    plan.push(`## Migration Plan for ${componentName}`);
    plan.push("");

    if (analysis.canBeServerComponent) {
      plan.push("### Convert to Server Component");
      plan.push('1. Remove "use client" directive');
      plan.push("2. Convert to async function");
      plan.push("3. Move data fetching to component level");
      plan.push("4. Add proper error handling");
      plan.push("5. Implement metadata generation if needed");
    } else {
      plan.push("### Optimize as Client Component");
      plan.push("1. Apply React.memo for re-render optimization");
      plan.push("2. Use useCallback for event handlers");
      plan.push("3. Use useMemo for expensive computations");
      plan.push("4. Consider code splitting if large");

      if (
        analysis.usesClientFeatures.includes("fetch") ||
        analysis.usesClientFeatures.includes("api.")
      ) {
        plan.push("5. Consider Server/Client hybrid approach");
        plan.push("   - Server component for data + SEO");
        plan.push("   - Client component for interactivity");
      }
    }

    plan.push("");
    plan.push("### Performance Improvements");
    plan.push("- Add performance monitoring");
    plan.push("- Implement error boundaries");
    plan.push("- Optimize bundle size");
    plan.push("- Add proper loading states");

    return plan;
  }
}

// Pre-configured optimization rules for common components
export const CommonComponentRules = {
  Dashboard: ComponentOptimizer.analyzeComponent("Dashboard", {
    hasInteractivity: true,
    usesClientState: true,
    hasUserSpecificData: true,
    isDataHeavy: true,
    requiresSEO: false,
    hasFormHandling: false,
    usesThirdPartyScripts: false,
    isFrequentlyUpdated: true,
    hasRealTimeData: true,
  }),

  ProductList: ComponentOptimizer.analyzeComponent("ProductList", {
    hasInteractivity: false,
    usesClientState: false,
    hasUserSpecificData: false,
    isDataHeavy: true,
    requiresSEO: true,
    hasFormHandling: false,
    usesThirdPartyScripts: false,
    isFrequentlyUpdated: false,
    hasRealTimeData: false,
  }),

  ContactForm: ComponentOptimizer.analyzeComponent("ContactForm", {
    hasInteractivity: true,
    usesClientState: true,
    hasUserSpecificData: false,
    isDataHeavy: false,
    requiresSEO: false,
    hasFormHandling: true,
    usesThirdPartyScripts: false,
    isFrequentlyUpdated: false,
    hasRealTimeData: false,
  }),

  Calendar: ComponentOptimizer.analyzeComponent("Calendar", {
    hasInteractivity: true,
    usesClientState: true,
    hasUserSpecificData: true,
    isDataHeavy: true,
    requiresSEO: false,
    hasFormHandling: true,
    usesThirdPartyScripts: false,
    isFrequentlyUpdated: true,
    hasRealTimeData: true,
  }),
};

// Export utilities
export { ComponentOptimizer, ServerClientPerformanceUtils, ComponentMigrationUtils };
