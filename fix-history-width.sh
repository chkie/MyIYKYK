#!/bin/bash

# Find line with "Quick Actions" closing </div>
# Move History Section AFTER it

# 1. Extract everything before Quick Actions section end
sed -n '1,199p' src/routes/+page.svelte > src/routes/+page.svelte.fixed

# 2. Add closing </div> for Quick Actions grid
echo "</div>" >> src/routes/+page.svelte.fixed

# 3. Add History Section (starts at line 201)
sed -n '201,$p' src/routes/+page.svelte >> src/routes/+page.svelte.fixed

# 4. Replace file
mv src/routes/+page.svelte.fixed src/routes/+page.svelte

echo "✅ History Section moved outside grid"
