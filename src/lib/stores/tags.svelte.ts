import { commands, type TagWithUsage } from '$lib/bindings';
import { unwrap } from '$lib/utils/ipc';

export type { TagWithUsage };

class TagsStore {
	list = $state<TagWithUsage[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	async load() {
		this.loading = true;
		this.error = null;
		try {
			this.list = unwrap(await commands.listTags());
		} catch (e) {
			this.error = String(e);
		} finally {
			this.loading = false;
		}
	}

	async create(name: string, color: string): Promise<TagWithUsage> {
		const tag = unwrap(await commands.createTag(name, color));
		this.list = [...this.list, tag].sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));
		return tag;
	}

	async update(id: number, name: string, color: string): Promise<TagWithUsage> {
		const updated = unwrap(await commands.updateTag(id, name, color));
		this.list = this.list
			.map((tag) => (tag.id === id ? updated : tag))
			.sort((tagA, tagB) => tagA.name.localeCompare(tagB.name));
		return updated;
	}

	async delete(id: number): Promise<void> {
		unwrap(await commands.deleteTag(id));
		this.list = this.list.filter((tag) => tag.id !== id);
	}
}

export const tagsStore = new TagsStore();
