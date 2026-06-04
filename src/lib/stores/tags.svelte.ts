/**
 * Tags store — stub.
 * Will be implemented in the Tag Manager milestone (build-order step 12).
 */
import type { Tag } from '$lib/types';

class TagsStore {
	list = $state<Tag[]>([]);

	// Populated in the Tag Manager milestone via IPC commands
}

export const tagsStore = new TagsStore();
