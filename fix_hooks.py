#!/usr/bin/env python3
"""
Fix React Hooks Rules violations in SevenDaysBoardView.tsx
The problem: useState/useRef/useEffect hooks are scattered throughout the component
Solution: Move all hooks to before the mobile check and any other code
"""

import re

with open("components/assistant/SevenDaysBoardView.tsx", "r") as f:
    lines = f.readlines()

# First, identify all the stray hooks that need to be moved
# They appear at:
# - Line 431: const [canScrollRight, setCanScrollRight] = useState(false)
# - Line 433-440: useEffect for canScrollRight
# - Line 443: const [isTodayVisible, setIsTodayVisible] = useState(true)
# - Line 445-468: useEffect for isTodayVisible

# Also, there's a duplicate scrollProgress that needs fixing

# Step 1: Remove duplicate scrollProgress
output = []
i = 0
scrollprogress_seen = False
while i < len(lines):
    line = lines[i]
    if "const [scrollProgress, setScrollProgress] = useState(0)" in line:
        if not scrollprogress_seen:
            output.append(line)
            scrollprogress_seen = True
        else:
            # Skip duplicate
            pass
    else:
        output.append(line)
    i += 1

lines = output

# Step 2: Find the component start and extract the initial hooks section
component_start = -1
for i, line in enumerate(lines):
    if "export function SevenDaysBoardView" in line:
        component_start = i
        break

# Find opening brace
opening_brace = -1
for i in range(component_start, min(component_start + 20, len(lines))):
    if "{" in lines[i]:
        opening_brace = i
        break

print(f"Component starts at line {component_start + 1}")
print(f"Opening brace at line {opening_brace + 1}")

# Find the initial hooks section (lines 58-72 or so)
# This is the first batch of useState/useRef

# Find where the hooks end and non-hook code begins
initial_hooks_end = -1
for i in range(opening_brace + 1, min(opening_brace + 50, len(lines))):
    line = lines[i].strip()
    if line.startswith("// Constants") or line.startswith("// Navigation"):
        initial_hooks_end = i
        break

if initial_hooks_end == -1:
    print("ERROR: Could not find end of initial hooks")
    exit(1)

print(f"Initial hooks end at line {initial_hooks_end + 1}")

# Now find all the scattered hooks after the initial batch
# And collect them to be moved

scattered_hooks = []
i = initial_hooks_end

# Look for:
# 1. const days: DayColumn[] = useMemo(
# 2. const [canScrollRight...
# 3. const [isTodayVisible...
# Any useEffect calls that appear after line ~75

# Find useMemo for 'days'
for i in range(initial_hooks_end, len(lines)):
    if "const days: DayColumn[]" in lines[i]:
        # Extract this entire useMemo
        scattered_hooks.append(("days_usememo", i, lines[i:lines.index(lines[i]) + 50]))
        break

# Now extract lines 431-468 area (canScrollRight and isTodayVisible with their useEffects)
# But let's be more surgical - find them by content

for i in range(initial_hooks_end, len(lines)):
    line = lines[i]
    if "const [canScrollRight, setCanScrollRight] = useState(false)" in line:
        print(f"Found canScrollRight useState at line {i + 1}")
    if "const [isTodayVisible, setIsTodayVisible] = useState(true)" in line:
        print(f"Found isTodayVisible useState at line {i + 1}")

print("\nNow need to carefully move hooks...")
print("This is complex - let's try a simpler fix instead")
print("\nSimple fix: Just remove the LATE hooks so they don't violate the rules")
print("Then add them back in correct order at the top")

# The actual fix: Extract the late hooks and move them to the top

# Find lines with late hook declarations
lines_to_remove = []
late_hooks_content = []

for i, line in enumerate(lines):
    if i > 150:  # After the initial section
        if "const [canScrollRight, setCanScrollRight]" in line:
            lines_to_remove.append(i)
        elif "const [isTodayVisible, setIsTodayVisible]" in line:
            lines_to_remove.append(i)
        elif "useEffect(() => {" in line and i > 150:
            # Check if it's related to canScrollRight or isTodayVisible
            # Look ahead
            for j in range(i, min(i+20, len(lines))):
                if "canScrollRight" in lines[j] or "isTodayVisible" in lines[j] or "scrollPosition" in lines[j]:
                    # This is a late useEffect, collect it
                    for k in range(i, min(i+20, len(lines))):
                        if "}, [" in lines[k]:
                            lines_to_remove.extend(range(i, k+1))
                            break
                    break

# Remove duplicates and sort
lines_to_remove = sorted(set(lines_to_remove), reverse=True)

print(f"\nLines to remove: {lines_to_remove}")

# For now, just write the file as-is to avoid breaking it further
with open("components/assistant/SevenDaysBoardView.tsx", "w") as f:
    f.writelines(lines)

print("\nFixed duplicate scrollProgress")
print("Manual editing needed for remaining hooks violations")

