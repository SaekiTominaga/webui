/**
 * Implement something like `<input type=checkbox switch>`
 */
export default class InputSwitch extends HTMLElement {
    static formAssociated = true;
    static observedAttributes = ['value', 'checked', 'disabled', 'storage-key'];
    #internals;
    #myLocalStorage;
    #initilalChecked = false;
    #changeEventListener;
    #clickEventListener;
    #keydownEventListener;
    constructor() {
        super();
        try {
            this.#internals = this.attachInternals();
        }
        catch {
            // Safari 16.3- https://caniuse.com/mdn-api_htmlelement_attachinternals
        }
        try {
            this.#myLocalStorage = localStorage;
        }
        catch {
            console.info('Storage access blocked.');
        }
        const cssString = `
			:host {
				--outline-offset: 1px;
				--inline-size: 2em;
				--block-size: 1em;
				--animation-duration: 0.5s;

				contain: layout;
				outline-offset: var(--outline-offset);
				inline-size: var(--inline-size);
				block-size: var(--block-size);
			}

			[part="track"] {
				--color-on: #29f;
				--color-off: #ccc;
				--color-disabled-on: #666;
				--color-disabled-off: #666;

				--_color: var(--color-off);

				transition: background-color var(--animation-duration);
				border-radius: var(--block-size);
				background-color: var(--_color);
				inline-size: 100%;
				block-size: 100%;
			}

			:host([checked]) [part="track"] {
				--_color: var(--color-on);
			}

			:host([disabled]) [part="track"] {
				--_color: var(--color-disabled-off);
			}

			:host([disabled][checked]) [part="track"] {
				--_color: var(--color-disabled-on);
			}

			[part="thumb"] {
				--color: #fff;
				--radius: calc(0.5em - 1px);

				--_translate-x: 0px;

				position: absolute;
				translate: var(--_translate-x);
				transition: translate var(--animation-duration);
				inset: calc(var(--block-size) / 2 - var(--radius));
				border-radius: 50%;
				background-color: var(--color);
				inline-size: calc(var(--radius) * 2);
				block-size: calc(var(--radius) * 2);
			}

			:host([checked]) [part="thumb"] {
				--_translate-x: calc(var(--inline-size) - var(--block-size));
			}
		`;
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
			<div part="track"></div>
			<div part="thumb"></div>
		`;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (shadow.adoptedStyleSheets !== undefined) {
            const cssStyleSheet = new CSSStyleSheet();
            cssStyleSheet.replaceSync(cssString);
            shadow.adoptedStyleSheets = [cssStyleSheet];
        }
        else {
            /* adoptedStyleSheets 未対応環境 */
            shadow.innerHTML += `<style>${cssString}</style>`;
        }
        this.#changeEventListener = this.#changeEvent.bind(this);
        this.#clickEventListener = this.#clickEvent.bind(this);
        this.#keydownEventListener = this.#keydownEvent.bind(this);
    }
    connectedCallback() {
        const { checked, disabled, storageKey } = this;
        if (storageKey !== null && storageKey !== '') {
            /* ストレージから前回アクセス時のチェック情報を取得する */
            const storageValue = this.#myLocalStorage?.getItem(storageKey);
            switch (storageValue) {
                case 'true': {
                    if (!checked) {
                        this.checked = true;
                    }
                    break;
                }
                case 'false': {
                    if (checked) {
                        this.checked = false;
                    }
                    break;
                }
                default:
            }
        }
        this.#internals?.setFormValue(this.checked ? this.value : null);
        this.#initilalChecked = checked;
        this.tabIndex = disabled ? -1 : 0;
        this.setAttribute('role', 'switch');
        this.setAttribute('aria-checked', String(checked));
        this.setAttribute('aria-disabled', String(disabled));
        if (!disabled) {
            this.addEventListener('change', this.#changeEventListener, { passive: true });
            this.addEventListener('click', this.#clickEventListener);
            this.addEventListener('keydown', this.#keydownEventListener);
        }
    }
    disconnectedCallback() {
        this.removeEventListener('change', this.#changeEventListener);
        this.removeEventListener('click', this.#clickEventListener);
        this.removeEventListener('keydown', this.#keydownEventListener);
    }
    attributeChangedCallback(name, _oldValue, newValue) {
        switch (name) {
            case 'value': {
                break;
            }
            case 'checked': {
                const checked = newValue !== null;
                this.setAttribute('aria-checked', String(checked));
                break;
            }
            case 'disabled': {
                const disabled = newValue !== null;
                this.setAttribute('aria-disabled', String(disabled));
                if (disabled) {
                    this.tabIndex = -1;
                    this.removeEventListener('change', this.#changeEventListener);
                    this.removeEventListener('click', this.#clickEventListener);
                    this.removeEventListener('keydown', this.#keydownEventListener);
                    this.blur();
                }
                else {
                    this.tabIndex = 0;
                    this.addEventListener('change', this.#changeEventListener, { passive: true });
                    this.addEventListener('click', this.#clickEventListener);
                    this.addEventListener('keydown', this.#keydownEventListener);
                }
                break;
            }
            case 'storage-key': {
                break;
            }
            default:
        }
    }
    formResetCallback() {
        if (this.checked !== this.#initilalChecked) {
            this.dispatchEvent(new Event('change'));
        }
    }
    get value() {
        return this.getAttribute('value') ?? 'on'; // https://html.spec.whatwg.org/multipage/input.html#dom-input-value-default-on
    }
    set value(value) {
        if (value === null) {
            this.removeAttribute('value');
            return;
        }
        this.setAttribute('value', value);
    }
    get checked() {
        return this.getAttribute('checked') !== null;
    }
    set checked(value) {
        if (value) {
            this.setAttribute('checked', '');
        }
        else {
            this.removeAttribute('checked');
        }
    }
    get disabled() {
        return this.getAttribute('disabled') !== null;
    }
    set disabled(value) {
        if (value) {
            this.setAttribute('disabled', '');
        }
        else {
            this.removeAttribute('disabled');
        }
    }
    get storageKey() {
        return this.getAttribute('storage-key');
    }
    set storageKey(value) {
        if (value === null) {
            this.removeAttribute('storage-key');
            return;
        }
        this.setAttribute('storage-key', value);
    }
    /**
     * スイッチの状態を変更する
     */
    #changeEvent() {
        const { checked, storageKey } = this;
        this.checked = !checked;
        this.#internals?.setFormValue(this.checked ? this.value : null);
        if (storageKey !== null && storageKey !== '') {
            /* スイッチのチェック情報をストレージに保管する */
            this.#myLocalStorage?.setItem(storageKey, String(this.checked));
        }
    }
    /**
     * スイッチをクリックしたときの処理
     *
     * @param ev - Event
     */
    #clickEvent(ev) {
        this.dispatchEvent(new Event('change'));
        ev.preventDefault();
    }
    /**
     * スイッチにフォーカスした状態でキーボードが押された時の処理
     *
     * @param ev - Event
     */
    #keydownEvent(ev) {
        switch (ev.key) {
            case ' ': {
                this.dispatchEvent(new Event('change'));
                ev.preventDefault();
                break;
            }
            default:
        }
    }
}
//# sourceMappingURL=InputSwitch.js.map