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
		this.renderRoot = getElement(NOTE_RENDERER_ROOT_ID);
		this.noteTemplate = new PropertizedTemplate(NOTE_TEMPLATE_ID);

		this.listeners = [];
		this.notes = [
			new Note(0, 'Note 1', 'Body 1', 'May 22'),
			new Note(1, 'Note 2', 'Body 2', 'May 22'),
			new Note(2, 'Note 3', 'Body 3', 'May 22'),
		];
	}

	initialize() {
		this.#render();

		// @ts-ignore
		this.searchBar.addEventListener('input', (event) => this.#render(event.target.value));
		this.addNoteButton.addEventListener('click', () => this.#addNewNote());
	}

	/**
	 * @param {string} [filter]
	 */
	#render(filter) {
		this.#clearView();

		const filteredNotes = filter
			? this.notes.filter((note) => note.matchFilter(filter))
			: this.notes;

		filteredNotes.forEach((note) => this.#renderNote(note));
	}

	/**
	 * @param {Note} note
	 */
	#renderNote(note) {
		const noteElement = this.noteTemplate.build(
			{
				title: note.title,
				content: note.content,
				createdAt: note.createdAt,
			},
			{
				edit: () => this.#editNote(note.id),
				delete: () => this.#deleteNote(note.id),
			}
		);

		const liElement = document.createElement('li');
		liElement.appendChild(noteElement);

		this.renderRoot.appendChild(liElement);
	}

	#clearView() {
		this.renderRoot.innerHTML = '';
	}

	#addNewNote() {
		const note = new Note(this.notes.length, 'New Note', '', 'Today');
		this.notes.push(note);
		// @ts-ignore
		this.searchBar.value = '';

		this.#render();
	}

	/**
	 * @param {number} id
	 */
	#editNote(id) {}

	/**
	 * @param {number} id
	 */
	#deleteNote(id) {
		const noteIndex = this.notes.findIndex((note) => note.id === id);

		if (noteIndex === -1) {
			throw new Error(`Note of id ${id} does not exist`);
		}

		this.notes.splice(noteIndex, 1);

		this.#render();
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
	 * @param {Record<string, () => void>} actions
	 */
	build(properties, actions) {
		const parsedTemplate = this.#parseTemplate(properties);

		// TODO: remove redundant div wrapper from result
		const root = document.createElement('div');
		root.innerHTML = parsedTemplate;

		this.#hookActions(root, actions);

		return root;
	}

	/**
	 * @param {Element} element
	 * @param {Record<string, () => void>} actions
	 */
	#hookActions(element, actions) {
		Object.entries(actions).forEach(([event, listener]) => {
			const actionElement = element.querySelector(`[data-action=${event}]`);

			if (!actionElement) {
				throw new Error(`Event ${event} missing in template ${this.template}`);
			}

			actionElement.addEventListener('click', listener);
		});
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
