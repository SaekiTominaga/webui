/**
 * Add animated motion to the `<portal>` element by Custom Elements
 */
export default class Portal extends HTMLElement {
	readonly #portalElement: HTMLPortalElement;

	readonly #portalClickEventListener: (ev: MouseEvent) => void;

	readonly #portalTrainsitionEndEventListener: (ev: TransitionEvent) => void;

	static get observedAttributes(): string[] {
		return ['src', 'referrerpolicy'];
	}

	constructor() {
		super();

		const cssString = `
			:host {
				--portal-width: 640px;
				--portal-height: 360px;
				--portal-max-width: 100%;
				--portal-max-height: 100vh;
				--portal-border-style: solid;
				--portal-border-width: 1px;
				--portal-border-color: currentColor;
				--portal-scale: 0.5;
				--portal-animation-duration: 0.5s;
				--portal-outline-style: solid;
				--portal-outline-width: 1px;
				--portal-outline-color: currentColor;
				--portal-outline-offset: 0px;

				display: inline-block;
				width: min(var(--portal-width), var(--portal-max-width));
				height: min(var(--portal-height), var(--portal-max-height));
				position: relative;
			}

			@media (prefers-reduced-motion) {
				:host {
					--portal-animation-duration: 0.01s;
				}
			}

			.portal {
				border: calc(var(--portal-border-width) / var(--portal-scale)) var(--portal-border-style) var(--portal-border-color);
				box-sizing: border-box;
				display: block;
				width: min(calc(var(--portal-width) / var(--portal-scale)), calc(var(--portal-max-width) / var(--portal-scale)));
				height: min(calc(var(--portal-height) / var(--portal-scale)), calc(var(--portal-max-height) / var(--portal-scale)));
				transform: scale(var(--portal-scale));
				transform-origin: 0 0;
				transition: width var(--portal-animation-duration), height var(--portal-animation-duration), top var(--portal-animation-duration), left var(--portal-animation-duration), transform var(--portal-animation-duration);
				cursor: pointer;
			}

			.portal:focus {
				outline: calc(var(--portal-outline-width) / var(--portal-scale)) var(--portal-outline-style) var(--portal-outline-color);
				outline-offset: calc(var(--portal-outline-offset) / var(--portal-scale));
			}

			.portal.-fullscreen {
				--portal-border-width: 0;

				position: fixed;
				width: 100vw !important;
				height: 100vh;
				top: 0 !important;
				left: 0 !important;
				transform: none;
				z-index: 2147483647;
			}
		`;

		const shadow = this.attachShadow({ mode: 'open' });
		shadow.innerHTML = `
			<portal id="portal" class="portal"></portal>
		`;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (shadow.adoptedStyleSheets !== undefined) {
			const cssStyleSheet = new CSSStyleSheet();
			cssStyleSheet.replaceSync(cssString);

			shadow.adoptedStyleSheets = [cssStyleSheet];
		} else {
			/* adoptedStyleSheets 未対応環境 */
			shadow.innerHTML += `<style>${cssString}</style>`;
		}

		this.#portalElement = this.shadowRoot?.getElementById('portal') as HTMLPortalElement;

		this.#portalClickEventListener = this.#portalClickEvent.bind(this);
		this.#portalTrainsitionEndEventListener = this.#portalTrainsitionEndEvent.bind(this);
	}

	connectedCallback(): void {
		const portalElement = this.#portalElement;

		const { src } = this;
		if (src !== null) {
			portalElement.src = src;
		}

		const referrerPolicy = this.referrerpolicy;
		if (referrerPolicy !== null) {
			portalElement.referrerPolicy = referrerPolicy;
		}

		portalElement.addEventListener('click', this.#portalClickEventListener);
		portalElement.addEventListener('transitionend', this.#portalTrainsitionEndEventListener, { passive: true });
	}

	disconnectedCallback(): void {
		const portalElement = this.#portalElement;

		portalElement.removeEventListener('click', this.#portalClickEventListener);
		portalElement.removeEventListener('transitionend', this.#portalTrainsitionEndEventListener);
	}

	attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
		switch (name) {
			case 'src': {
				this.#portalElement.src = newValue;
				break;
			}
			case 'referrerpolicy': {
				this.#portalElement.referrerPolicy = newValue;
				break;
			}
			default:
		}
	}

	get src(): string | null {
		return this.getAttribute('src');
	}

	set src(value: string | null) {
		if (value === null) {
			this.removeAttribute('src');
			return;
		}

		this.setAttribute('src', value);
	}

	get referrerpolicy(): string | null {
		return this.getAttribute('referrerpolicy');
	}

	set referrerpolicy(value: string | null) {
		if (value === null) {
			this.removeAttribute('referrerpolicy');
			return;
		}

		this.setAttribute('referrerpolicy', value);
	}

	/**
	 * <portal> 要素をクリックした時の処理
	 *
	 * @param ev - Event
	 */
	#portalClickEvent(ev: MouseEvent): void {
		ev.preventDefault();

		this.#fullScreen();
	}

	/**
	 * <portal> の包括要素のアニメーションが終わった時の処理
	 *
	 * @param ev - Event
	 */
	#portalTrainsitionEndEvent(ev: TransitionEvent): void {
		switch (
			ev.propertyName // ウィンドウサイズの変更でもアニメーションが起こってしまうので、とくに height を無視したい
		) {
			case 'transform': {
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				this.#portalElement.activate();
				break;
			}
			default:
		}
	}

	/**
	 * <portal> の包括要素をフルスクリーン表示にする
	 */
	#fullScreen(): void {
		const portalElement = this.#portalElement;

		/* 表示位置を変えずに potision: fixed にするための前準備 */
		const rect = portalElement.getBoundingClientRect();

		portalElement.style.top = `${rect.top}px`;
		portalElement.style.left = `${rect.left}px`;
		portalElement.style.width = `${rect.width}px`;

		/* potision: fixed を使ったフルスクリーン表示にする */
		setTimeout(() => {
			portalElement.classList.add('-fullscreen');
		});
	}
}
