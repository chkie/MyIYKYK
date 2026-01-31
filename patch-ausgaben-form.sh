#!/bin/bash

# Add profileStore import and hidden field to ausgaben form

# 1. Add import at top
sed -i '' '1a\
	import { profileStore } from '"'"'$lib/stores/profile.svelte'"'"';
' src/routes/ausgaben/+page.svelte

# 2. Find line with "input type="hidden" name="monthId"" and add createdBy field after
sed -i '' '/type="hidden" name="monthId"/a\
				<input type="hidden" name="createdBy" value={profileStore.currentProfileId || ""} />
' src/routes/ausgaben/+page.svelte

echo "✅ Ausgaben form patched with createdBy field"
