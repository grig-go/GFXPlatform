# Bug Fix Priority List

## Critical (Blocks Compilation) - 145 errors

### Fixed (6)
1. ✅ Added missing tool types (svg, icon, table) to DesignTool
2. ✅ Fixed TopicBadgeElement type usage
3. ✅ Added TickerTopicType import
4. ✅ Removed duplicate icon handler
5. ✅ Fixed icon tool implementation
6. ✅ Removed invalid easing property

### High Priority (Must Fix First)

#### 1. TopicBadgeElement.tsx (17 errors)
- Type mismatches with TopicBadgeStyleData
- All properties exist in type, but TypeScript isn't recognizing them
- **Fix**: Ensure proper type casting/guards

#### 2. Canvas.tsx (7 errors)
- Tool type checks failing for svg/icon/table
- **Fix**: Type guards need updating

#### 3. PropertiesPanel.tsx (26 errors)
- Content update type errors
- fill property on non-shape elements
- position_x/y type errors
- **Fix**: Add proper type guards for content updates

#### 4. DesignSystemDialog.tsx (7 errors)
- Type mismatches with ProjectDesignSystem
- enabledSections property access
- **Fix**: Align types between database and designSystem

#### 5. Timeline.tsx (13 errors)
- TimelineKeyframe type mismatches
- **Fix**: Update TimelineKeyframe type definitions

### Medium Priority

#### 6. Chart Components (10 errors)
- Missing exports (ProgressBar, ChartRenderer)
- Type mismatches in PieChart
- Unused variables
- **Fix**: Remove unused exports or create missing files

#### 7. StarterProjectService.ts (8 errors)
- Missing always_on property
- Type mismatches
- **Fix**: Add always_on to layer creation

#### 8. Various Files (Unused imports, implicit any)
- Clean up unused imports
- Add type annotations for implicit any
- **Fix**: Systematic cleanup

## Testing Strategy

1. Fix all Critical/High Priority errors first
2. Run TypeScript compilation check
3. Test app manually for each fixed feature
4. Fix Medium Priority errors
5. Final comprehensive test

## Estimated Time

- Critical fixes: 2-3 hours
- Testing: 1-2 hours
- Medium priority: 1 hour
- **Total: 4-6 hours**





