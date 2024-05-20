const NOTE_TEMPLATE_ID = '#template-note';
const NOTE_RENDERER_ROOT_ID = '#note-renderer';
const SEARCH_BAR_ID = '#search-bar';

document.addEventListener('DOMContentLoaded', () => {
	const app = new NoteApp();
	app.initialize();
});

class NoteApp {
	constructor() {
		this.searchBar = new SearchBar();
		this.noteRenderer = new NoteRenderer();

		this.notes = [
			new Note(1, 'Note 1', 'Body 1', 'May 22'),
			new Note(2, 'Note 2', 'Body 2', 'May 22'),
			new Note(3, 'Note 3', 'Body 3', 'May 22'),
		];
	}

	initialize() {
		this.#render();
	}

	/**
	 * @param {string} [filter]
	 */
	#render(filter) {
		if (!filter) {
			this.noteRenderer.render(this.notes);
			return;
		}

		const filteredNotes = this.notes.filter((note) => note.matchFilter(filter));
		this.noteRenderer.render(filteredNotes);
	}
}

class NoteRenderer {
	constructor() {
		this.noteTemplate = new PropertizedTemplate(NOTE_TEMPLATE_ID);
		this.root = getElement(NOTE_RENDERER_ROOT_ID);
	}

	/**
	 * @param {Note[]} notes
	 */
	render(notes) {
		this.#clear();
		notes.forEach((note) => this.#appendNote(note));
	}

	/**
	 * @param {Note} note
	 */
	#appendNote(note) {
		const noteElement = this.noteTemplate.parse({
			title: note.title,
			content: note.content,
			createdAt: note.createdAt,
		});

		const listItemElement = document.createElement('li');
		listItemElement.appendChild(noteElement);

		this.root.appendChild(listItemElement);
	}

	#clear() {
		this.root.innerHTML = '';
	}
}

class PropertizedTemplate {
	/**
	 * @param {string} query
	 */
	constructor(query) {
		const element = getElement(query);

		if (!(element instanceof HTMLTemplateElement)) {
			throw new Error(`${element} is not a template`);
		}

		this.template = element;
	}

	/**
	 * @param {Record<string, string>} properties
	 */
	parse(properties) {
		const parsedTemplate = this.template.innerHTML.replace(
			/{(.*?)}/g,
			(_, key) => properties[key.trim()]
		);

		// TODO: remove redundant div wrapper from result
		const root = document.createElement('div');
		root.innerHTML = parsedTemplate;

		return root;
	}
}

class SearchBar {
	constructor() {
		this.input = getElement(SEARCH_BAR_ID);
	}
}

class Note {
	/**
	 * @param {number} id
	 * @param {string} title
	 * @param {string} content
	 * @param {string} createdAt
	 */
	constructor(id, title, content, createdAt) {
		this.id = id;
		this.title = title;
		this.content = content;
		this.createdAt = createdAt;
	}

	/**
	 * @param {string} filter
	 */
	matchFilter(filter) {
		return this.title.includes(filter) || this.content.includes(filter);
	}
}

/**
 * Returns a DOM element and asserts it exists
 * @param {string} query
 * @returns {Element}
 */
const getElement = (query) => {
	const element = document.querySelector(query);

	if (!element) {
		throw new Error(`Element of query ${query} does not exist`);
	}

	return element;
};
