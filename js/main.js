document.addEventListener('DOMContentLoaded', () => {
	const app = new NoteApp();
	app.initialize();
});

/**
 * @typedef {'title' | 'content' | 'createdAt'} NoteProperty
 * @typedef {'edit' | 'delete'} NoteEvent
 */

class NoteApp {
	constructor() {
		this.searchBar = new Field('#search-bar');
		this.addNoteButton = new Button('#add-note');
		this.renderRoot = new AppElement('#note-renderer');
		this.disclaimer = new Disclaimer('#empty-disclaimer');
		this.compositionPanel = new NoteCompositionPanel();

		/** @type {!PropertizedTemplate<NoteProperty, NoteEvent>} */
		this.noteTemplate = new PropertizedTemplate('#template-note');

		this.notes = [];
	}

	initialize() {
		const mockDate = new Date(966, 4, 14);
		this.notes = [
			new Note('Note 1', 'Body 1', mockDate),
			new Note('Note 2', 'Body 2', mockDate),
			new Note('Note 3', 'Body 3', mockDate),
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

		if (!this.notes.length) {
			this.disclaimer.queryConfirm(() => this.#addNewNote());
			this.addNoteButton.hide();
			return;
		}
		if (this.compositionPanel.isHidden()) this.addNoteButton.show();

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
				createdAt: note.getFormattedDate(),
			},
			{
				edit: () => this.#editNote(note),
				delete: () => this.#deleteNote(note),
			}
		);

		const liElement = document.createElement('li');
		liElement.appendChild(noteElement);

		this.renderRoot.element.appendChild(liElement);
	}

	#clearListView() {
		this.renderRoot.element.innerHTML = '';
	}

	#prepareViewForComposition() {
		this.searchBar.clear();
		this.addNoteButton.hide();
		this.disclaimer.hide();
	}

	#addNewNote() {
		this.#prepareViewForComposition();

		this.compositionPanel.queryNew((newNote) => {
			this.notes.push(newNote);
			this.#render();
		});
	}

	/**
	 * @param {Note} existingNote
	 */
	#editNote(existingNote) {
		this.#prepareViewForComposition();

		this.compositionPanel.queryEdit(existingNote, (newNote) => {
			existingNote.title = newNote.title;
			existingNote.content = newNote.content;
			existingNote.createdAt = newNote.createdAt;

			this.#render();
		});
	}

	/**
	 * @param {Note} note
	 */
	#deleteNote(note) {
		const noteIndex = this.notes.indexOf(note);
		if (noteIndex === -1) {
			throw new Error(`Note is not applicable`);
		}

		this.notes.splice(noteIndex, 1);
		this.#render();
	}
}

class Note {
	/**
	 * @param {string} title
	 * @param {string} content
	 * @param {Date} createdAt
	 */
	constructor(title, content, createdAt) {
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
			this.getFormattedDate().toLowerCase().includes(lowercaseFilter)
		);
	}

	getFormattedDate() {
		const monthAbbreviations = [
			'jan',
			'feb',
			'mar',
			'apr',
			'may',
			'jun',
			'jul',
			'aug',
			'sep',
			'oct',
			'nov',
			'dec',
		];
		const month = monthAbbreviations[this.createdAt.getMonth() - 1];

		return `${month} ${this.createdAt.getDate()}`;
	}
}

/**
 * @typedef {Record<PropertyName, string>} TemplateProperties
 * @template {string} PropertyName
 */

/**
 * @typedef {Record<EventName, () => void>} TemplateActions
 * @template {string} EventName
 */

/**
 * @template {string} PropertyName
 * @template {string} EventName
 */
class PropertizedTemplate {
	static PROPERTY_REGEX = /{(.*?)}/g;

	/**
	 * @param {string} query
	 */
	constructor(query) {
		const element = document.querySelector(query);

		if (!(element instanceof HTMLTemplateElement)) {
			throw new Error(`Element of query ${query} does not exist or is not a template`);
		}

		this.template = element;
	}

	/**
	 * @param {TemplateProperties<PropertyName>} properties
	 * @param {TemplateActions<EventName>} actions
	 */
	build(properties, actions) {
		const parsedTemplate = this.#parseTemplate(properties);

		const temporaryRoot = document.createElement('div');
		temporaryRoot.innerHTML = parsedTemplate;
		const element = temporaryRoot.firstElementChild;

		if (!element) {
			throw new Error('Failed to build from template');
		}

		this.#hookActions(element, actions);

		return element;
	}

	/**
	 * @param {Element} element
	 * @param {TemplateActions<EventName>} actions
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
	 * @param {TemplateProperties<PropertyName>} properties
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

	/**
	 * @param {string} value
	 */
	setValue(value) {
		// @ts-ignore
		this.element.value = value;
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

	/**
	 * @param {string} label
	 */
	setLabel(label) {
		// @ts-ignore
		this.element.innerText = label;
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
	static ADD_BUTTON = 'Add';
	static EDIT_BUTTON = 'Confirm';

	constructor() {
		const rootQuery = '#note-composition-panel';
		super(rootQuery);
		this.root = new AppElement(rootQuery);
		this.title = new TextBlock(rootQuery, 'h2');
		this.titleField = new Field('#note-composition-panel-title');
		this.contentField = new Field('#note-composition-panel-content');
		this.cancelButton = new Button('#note-composition-panel-cancel');
		this.submitButton = new Button('#note-composition-panel-add-button');

		this.#setup();
	}

	/**
	 * @param {(newNote: Note) => void} submitCallback
	 */
	queryNew(submitCallback) {
		this.title.setText(NoteCompositionPanel.ADD_TITLE);
		this.submitButton.setLabel(NoteCompositionPanel.ADD_BUTTON);

		this.#open(submitCallback);
	}

	/**
	 * @param {Note} existingNote
	 * @param {(updatedNote: Note) => void} submitCallback
	 */
	queryEdit(existingNote, submitCallback) {
		this.title.setText(NoteCompositionPanel.EDIT_TITLE);
		this.submitButton.setLabel(NoteCompositionPanel.EDIT_BUTTON);
		this.titleField.setValue(existingNote.title);
		this.contentField.setValue(existingNote.content);
		this.#validate();

		this.#open(submitCallback);
	}

	/**
	 * @param {() => void} callback
	 */
	onCancel(callback) {
		this.cancelButton.onClick(() => callback());
	}

	close() {
		this.root.hide();
		this.titleField.clear();
		this.contentField.clear();
		this.submitButton.disable();
	}

	#setup() {
		this.close();
		this.titleField.onChange(() => this.#validate());
		this.contentField.onChange(() => this.#validate());
	}

	#validate() {
		const isAnyEmpty = this.contentField.getValue() === '' || this.titleField.getValue() === '';

		this.submitButton.setEnabled(!isAnyEmpty);
	}

	/**
	 * @param {(note: Note) => void} submitCallback
	 */
	#open(submitCallback) {
		const handleClick = () => {
			const title = this.titleField.getValue();
			const content = this.contentField.getValue();
			const createdAt = new Date(Date.now());
			this.close();

			submitCallback(new Note(title, content, createdAt));
		};

		this.cancelButton.onClick(() => this.submitButton.offClick(handleClick));
		this.submitButton.onClick(handleClick, { once: true });

		this.root.show();
	}
}
