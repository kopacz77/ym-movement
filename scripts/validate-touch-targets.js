#!/usr/bin/env node

// Touch Target Validation Script for YM Movement Mobile Enhancements
// This script validates that all interactive elements meet WCAG 2.1 AA standards

/**
 * Touch Target Validation Function
 * Checks all interactive elements for 44px minimum size
 */
function validateTouchTargets() {
  const results = {
    passed: [],
    failed: [],
    warnings: [],
    total: 0,
    summary: {}
  };
  
  // Define interactive element selectors
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea', 
    '[role="button"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[tabindex="0"]',
    '[onclick]',
    '.cursor-pointer'
  ];
  
  console.log('🧪 Starting Touch Target Validation...\n');
  
  interactiveSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach((element, index) => {
      // Skip hidden or visually hidden elements
      const styles = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      if (
        styles.display === 'none' ||
        styles.visibility === 'hidden' ||
        styles.opacity === '0' ||
        rect.width === 0 ||
        rect.height === 0 ||
        element.offsetParent === null
      ) {
        return; // Skip invisible elements
      }
      
      const isValid = rect.width >= 44 && rect.height >= 44;
      const isWarning = (rect.width >= 40 && rect.width < 44) || (rect.height >= 40 && rect.height < 44);
      
      const testResult = {
        selector,
        index,
        element: element.tagName.toLowerCase(),
        classes: element.className || 'no-class',
        id: element.id || 'no-id',
        size: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
        position: `(${Math.round(rect.left)}, ${Math.round(rect.top)})`,
        isValid,
        isWarning,
        text: (element.textContent || element.value || element.alt || '').trim().substring(0, 30),
        ariaLabel: element.getAttribute('aria-label') || element.getAttribute('title') || 'no-label',
        computedSize: {
          width: rect.width,
          height: rect.height,
          minWidth: styles.minWidth,
          minHeight: styles.minHeight
        }
      };
      
      if (isValid) {
        results.passed.push(testResult);
      } else if (isWarning) {
        results.warnings.push(testResult);
      } else {
        results.failed.push(testResult);
      }
      
      results.total++;
    });
  });
  
  // Generate summary
  results.summary = {
    total: results.total,
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    passRate: results.total > 0 ? Math.round((results.passed.length / results.total) * 100) : 0,
    complianceLevel: results.failed.length === 0 ? 'WCAG AA Compliant' : 'Non-Compliant'
  };
  
  return results;
}

/**
 * Format and display validation results
 */
function displayResults(results) {
  const { summary, failed, warnings, passed } = results;
  
  // Display summary
  console.log('📊 TOUCH TARGET VALIDATION SUMMARY');
  console.log('=====================================');
  console.log(`Total Interactive Elements: ${summary.total}`);
  console.log(`✅ Passed (≥44px): ${summary.passed}`);
  console.log(`⚠️  Warnings (40-43px): ${summary.warnings}`);
  console.log(`❌ Failed (<40px): ${summary.failed}`);
  console.log(`📈 Pass Rate: ${summary.passRate}%`);
  console.log(`🎯 Compliance: ${summary.complianceLevel}\n`);
  
  // Display failed elements (critical issues)
  if (failed.length > 0) {
    console.log('❌ CRITICAL ISSUES - Elements Below 40px:');
    console.log('==========================================');
    failed.forEach((item, index) => {
      console.log(`${index + 1}. ${item.element}#${item.id}.${item.classes}`);
      console.log(`   Size: ${item.size} | Position: ${item.position}`);
      console.log(`   Text: "${item.text}" | Label: "${item.ariaLabel}"`);
      console.log(`   Selector: ${item.selector}`);
      console.log('');
    });
  }
  
  // Display warnings (elements close to minimum)
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS - Elements Close to Minimum (40-43px):');
    console.log('==================================================');
    warnings.forEach((item, index) => {
      console.log(`${index + 1}. ${item.element}#${item.id}.${item.classes}`);
      console.log(`   Size: ${item.size} | Position: ${item.position}`);
      console.log(`   Text: "${item.text}" | Label: "${item.ariaLabel}"`);
      console.log('');
    });
  }
  
  // Display success message if all passed
  if (failed.length === 0 && warnings.length === 0) {
    console.log('🎉 EXCELLENT! All interactive elements meet WCAG 2.1 AA standards!');
    console.log('All elements are ≥44px and properly touch-accessible.\n');
  }
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  console.log('===================');
  if (failed.length > 0) {
    console.log('• Fix critical issues by ensuring all elements are ≥44px');
    console.log('• Use min-h-[44px] and min-w-[44px] Tailwind classes');
    console.log('• Consider using the TouchButton or TouchIconButton components');
  }
  if (warnings.length > 0) {
    console.log('• Review warning elements - they may be difficult for some users');
    console.log('• Consider increasing padding or minimum sizes');
  }
  if (failed.length === 0) {
    console.log('• Great work on touch accessibility!');
    console.log('• Consider testing on physical devices for validation');
  }
  console.log('• Test with actual fingers/thumbs, not just mouse cursors');
  console.log('• Ensure 8px minimum spacing between touch targets\n');
}

/**
 * Additional validation for spacing between touch targets
 */
function validateTouchSpacing() {
  console.log('📏 VALIDATING TOUCH TARGET SPACING...\n');
  
  const touchElements = document.querySelectorAll(`
    button:not([style*="display: none"]),
    a[href]:not([style*="display: none"]),
    input:not([type="hidden"]):not([style*="display: none"]),
    [role="button"]:not([style*="display: none"])
  `);
  
  const spacingIssues = [];
  
  touchElements.forEach((element, index) => {
    const rect1 = element.getBoundingClientRect();
    
    // Skip if element is not visible
    if (rect1.width === 0 || rect1.height === 0) return;
    
    touchElements.forEach((otherElement, otherIndex) => {
      if (index >= otherIndex) return; // Avoid duplicate checks
      
      const rect2 = otherElement.getBoundingClientRect();
      
      // Skip if other element is not visible
      if (rect2.width === 0 || rect2.height === 0) return;
      
      // Calculate distance between elements
      const horizontalDistance = Math.max(0, 
        Math.max(rect1.left - rect2.right, rect2.left - rect1.right)
      );
      const verticalDistance = Math.max(0,
        Math.max(rect1.top - rect2.bottom, rect2.top - rect1.bottom)
      );
      
      // Check if elements are adjacent (not overlapping)
      const areAdjacent = horizontalDistance < 50 || verticalDistance < 50;
      const minSpacing = 8;
      
      if (areAdjacent && (horizontalDistance < minSpacing && horizontalDistance > 0)) {
        spacingIssues.push({
          element1: `${element.tagName}#${element.id || 'no-id'}`,
          element2: `${otherElement.tagName}#${otherElement.id || 'no-id'}`, 
          distance: Math.round(horizontalDistance),
          type: 'horizontal'
        });
      }
      
      if (areAdjacent && (verticalDistance < minSpacing && verticalDistance > 0)) {
        spacingIssues.push({
          element1: `${element.tagName}#${element.id || 'no-id'}`,
          element2: `${otherElement.tagName}#${otherElement.id || 'no-id'}`,
          distance: Math.round(verticalDistance),
          type: 'vertical'
        });
      }
    });
  });
  
  if (spacingIssues.length > 0) {
    console.log('⚠️  SPACING ISSUES FOUND:');
    spacingIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.element1} ↔️ ${issue.element2}`);
      console.log(`   ${issue.type} distance: ${issue.distance}px (minimum: 8px)`);
    });
  } else {
    console.log('✅ Touch target spacing looks good!');
  }
  
  console.log('');
}

// Make functions available globally for browser console use
if (typeof window !== 'undefined') {
  window.validateTouchTargets = validateTouchTargets;
  window.displayResults = displayResults;
  window.validateTouchSpacing = validateTouchSpacing;
  
  // Auto-run validation if script is loaded directly
  window.runTouchTargetValidation = function() {
    const results = validateTouchTargets();
    displayResults(results);
    validateTouchSpacing();
    return results;
  };
  
  console.log('🔧 Touch Target Validation Tools Loaded!');
  console.log('Run window.runTouchTargetValidation() to test the current page.');
}

// For Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateTouchTargets,
    displayResults,
    validateTouchSpacing
  };
}