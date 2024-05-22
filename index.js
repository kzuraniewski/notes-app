document.addEventListener('DOMContentLoaded', () => {
	const app = new NoteApp();
	app.initialize();
});

class NoteApp {
	constructor() {
		this.searchBar = new Field('#search-bar');
		this.addNoteButton = new Button('#add-note');
		this.renderRoot = new AppElement('#note-renderer');
		this.disclaimer = new Disclaimer('#empty-disclaimer');
		this.compositionPanel = new NoteCompositionPanel();
		this.noteTemplate = new PropertizedTemplate('#template-note');

		this.notes = [];
	}

	initialize() {
		this.notes = [
			new Note(0, 'Note 1', 'Body 1', 'May 22'),
			new Note(1, 'Note 2', 'Body 2', 'May 22'),
			new Note(2, 'Note 3', 'Body 3', 'May 22'),
		];

		this.#render();
		this.#setupEvents();
	}

	#setupEvents() {
		this.searchBar.onChange((filter) => this.#render(filter));
		this.addNoteButton.onClick(() => this.#addNewNote());
		this.compositionPanel.onCancel(() => {
			this.compositionPanel.close();
			this.#render();
		});
	}

	/**
	 * @param {string} [filter]
	 */
	#render(filter) {
		this.#clearListView();

		if (!this.notes.length || !this.compositionPanel.isHidden()) {
			this.disclaimer.queryConfirm(() => this.#addNewNote());
			this.addNoteButton.hide();
			return;
		}
		this.addNoteButton.show();

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

		this.renderRoot.element.appendChild(liElement);
	}

	#clearListView() {
		this.renderRoot.element.innerHTML = '';
	}

	#addNewNote() {
		this.searchBar.clear();
		this.addNoteButton.hide();
		this.disclaimer.hide();

		this.compositionPanel.queryNew(({ title, content }) => {
			const note = new Note(this.notes.length, title, content, 'Today');
			this.notes.push(note);

			this.#render();
		});
	}

	/**
	 * @param {number} id
	 */
	#editNote(id) {
		this.searchBar.clear();
		this.addNoteButton.hide();
		this.disclaimer.hide();

		this.compositionPanel.queryEdit(({ title, content }) => {
			// ...

			this.#render();
		});

		this.#render();
	}

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

class PropertizedTemplate {
	static PROPERTY_REGEX = /{(.*?)}/g;

	/**
	 * @param {string} query
	 */
	constructor(query) {
		const element = document.querySelector(query);

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

class AppElement {
	/**
	 * @param {string[]} queryElements
	 */
	constructor(...queryElements) {
		const query = queryElements.join(' ');
		const element = document.querySelector(query);

		if (!element) {
			throw new Error(`Element of query ${query} does not exist`);
		}

		this.element = element;
	}

	hide() {
		this.element.classList.add('hidden');
	}

	show() {
		this.element.classList.remove('hidden');
	}

	isHidden() {
		return this.element.classList.contains('hidden');
	}

	/**
	 * @param {() => void} callback
	 * @param {boolean | AddEventListenerOptions} [options]
	 */
	onClick(callback, options) {
		this.element.addEventListener('click', callback, options);
	}

	/**
	 * @param {() => void} callback
	 */
	offClick(callback) {
		this.element.removeEventListener('click', callback);
	}
}

class Field extends AppElement {
	/**
	 * @param {(value: string) => void} callback
	 */
	onChange(callback) {
		// @ts-ignore
		this.element.addEventListener('input', (event) => callback(event.target.value));
	}

	clear() {
		// @ts-ignore
		this.element.value = '';
	}

	getValue() {
		// @ts-ignore
		return this.element.value;
	}
}

class Button extends AppElement {
	disable() {
		this.element.setAttribute('disabled', '');
	}

	enable() {
		this.element.removeAttribute('disabled');
	}

	/**
	 * @param {boolean} enabled
	 */
	setEnabled(enabled) {
		if (enabled) this.enable();
		else this.disable();
	}
}

class TextBlock extends AppElement {
	/**
	 * @param {string} text
	 */
	setText(text) {
		this.element.textContent = text;
	}
}

class Disclaimer extends AppElement {
	/**
	 * @param {string} rootQuery
	 */
	constructor(rootQuery) {
		super(rootQuery);
		this.confirmButton = new Button(rootQuery, 'button');

		this.hide();
	}

	/**
	 * @param {() => void} confirmCallback
	 */
	queryConfirm(confirmCallback) {
		this.show();
		this.confirmButton.onClick(
			() => {
				confirmCallback();
				this.hide();
			},
			{ once: true }
		);
	}
}

class NoteCompositionPanel extends AppElement {
	static ADD_TITLE = 'Add new note';
	static EDIT_TITLE = 'Edit note';

	constructor() {
		const rootQuery = '#note-composition-panel';
		super(rootQuery);
		this.root = new AppElement(rootQuery);
		this.title = new TextBlock(rootQuery, 'h2');
		this.contentField = new Field('#note-composition-panel-content');
		this.cancelButton = new Button('#note-composition-panel-cancel');
		this.submitButton = new Button('#note-composition-panel-add-button');

		this.#setup();
	}

	#setup() {
		this.close();

		this.contentField.onChange((text) => {
			this.submitButton.setEnabled(text !== '');
		});
	}

	/**
	 * @param {(data: { title: string; content: string }) => void} submitCallback
	 */
	queryNew(submitCallback) {
		this.#openWithTitle(NoteCompositionPanel.ADD_TITLE, submitCallback);
	}

	/**
	 * @param {(data: { title: string; content: string }) => void} submitCallback
	 */
	queryEdit(submitCallback) {
		this.#openWithTitle(NoteCompositionPanel.EDIT_TITLE, submitCallback);
	}

	/**
	 * @param {() => void} callback
	 */
	onCancel(callback) {
		this.cancelButton.onClick(() => callback());
	}

	close() {
		this.root.hide();
		this.contentField.clear();
		this.submitButton.disable();
	}

	/**
	 * @param {string} title
	 * @param {(data: { title: string; content: string }) => void} submitCallback
	 */
	#openWithTitle(title, submitCallback) {
		this.title.setText(title);

		const handleClick = () => {
			const content = this.contentField.getValue();
			this.close();

			submitCallback({
				// TODO: read title
				title: 'New Note',
				content,
			});
		};

		this.cancelButton.onClick(() => this.submitButton.offClick(handleClick));
		this.submitButton.onClick(handleClick, { once: true });

		this.root.show();
	}
}
