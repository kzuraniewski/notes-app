const NOTE_TEMPLATE_ID = '#template-note';
const NOTE_RENDERER_ROOT_ID = '#note-renderer';
const SEARCH_BAR_ID = '#search-bar';
const ADD_NOTE_BUTTON_ID = '#add-note';

document.addEventListener('DOMContentLoaded', () => {
	const app = new NoteApp();
	app.initialize();
});

class NoteApp {
	constructor() {
		this.searchBar = getElement(SEARCH_BAR_ID);
		this.addNoteButton = getElement(ADD_NOTE_BUTTON_ID);
		this.noteRenderer = new NoteRenderer();

		this.notes = [
			new Note(0, 'Note 1', 'Body 1', 'May 22'),
			new Note(1, 'Note 2', 'Body 2', 'May 22'),
			new Note(2, 'Note 3', 'Body 3', 'May 22'),
		];
	}

	initialize() {
		this.#render();

		this.searchBar.addEventListener('input', (event) => this.#handleFilterChange(event));
		this.addNoteButton.addEventListener('click', () => this.#addNewNote());
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

	#addNewNote() {
		const note = new Note(this.notes.length, 'New Note', '', 'Today');
		this.notes.push(note);

		this.#render();
	}

	/**
	 * @param {Event} event
	 */
	#handleFilterChange(event) {
		// @ts-ignore
		const filter = event.target.value;
		this.#render(filter);
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
		const noteElement = this.noteTemplate.build({
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
	static PROPERTY_REGEX = /{(.*?)}/g;

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
	build(properties) {
		const parsedTemplate = this.#parseTemplate(properties);

		// TODO: remove redundant div wrapper from result
		const root = document.createElement('div');
		root.innerHTML = parsedTemplate;

		return root;
	}

	/**
	 * @param {Record<string, string>} properties
	 */
	#parseTemplate(properties) {
		return this.template.innerHTML.replace(
			PropertizedTemplate.PROPERTY_REGEX,
			(_, key) => properties[key.trim()]
		);
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
		const lowercaseFilter = filter.toLowerCase();
		return (
			this.title.toLowerCase().includes(lowercaseFilter) ||
			this.content.toLowerCase().includes(lowercaseFilter) ||
			this.createdAt.toLowerCase().includes(lowercaseFilter)
		);
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
