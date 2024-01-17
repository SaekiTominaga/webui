import HTMLPopoverElement from './CustomElementPopover.js';
customElements.define('x-popover', HTMLPopoverElement);
/**
 * Footnote reference popover
 */
export default class {
    #popoverTriggerElement;
    #footnoteElement; // 脚注要素（ポップオーバーの内容をここからコピーする）
    #popoverElement;
    #popoverLabel; // ポップオーバーに設定するラベル
    #popoverClass; // ポップオーバーに設定するクラス名
    #popoverHideText; // ポップオーバーの閉じるボタンのテキスト
    #popoverHideImageSrc; // ポップオーバーの閉じるボタンの画像パス
    #mouseenterDelay = 250; // mouseenter 時にポップオーバーを表示する遅延時間（ミリ秒）
    #mouseleaveDelay = 250; // mouseleave 時にポップオーバーを非表示にする遅延時間（ミリ秒）
    #mouseenterTimeoutId; // ポップオーバーを表示する際のタイマーの識別 ID（`clearTimeout()` で使用）
    #mouseleaveTimeoutId; // ポップオーバーを非表示にする際のタイマーの識別 ID（`clearTimeout()` で使用）
    /**
     * @param thisElement - Target element
     */
    constructor(thisElement) {
        this.#popoverTriggerElement = thisElement;
        const { href } = thisElement;
        const { popoverLabel, popoverClass, popoverCloseText: popoverHideText, popoverCloseImageSrc: popoverHideImageSrc, mouseenterDelay, mouseleaveDelay, } = thisElement.dataset;
        if (href === '') {
            throw new Error('Attribute: `href` is not set.');
        }
        const footnoteUrl = new URL(href);
        if (footnoteUrl.origin !== location.origin || footnoteUrl.pathname !== location.pathname) {
            throw new Error('Attribute: `href` value must be in the same content.');
        }
        const footnoteId = footnoteUrl.hash.substring(1);
        const footnoteElement = document.getElementById(footnoteId);
        if (footnoteElement === null) {
            throw new Error(`Element: #${footnoteId} can not found.`);
        }
        this.#footnoteElement = footnoteElement;
        this.#popoverLabel = popoverLabel;
        this.#popoverClass = popoverClass;
        this.#popoverHideText = popoverHideText;
        this.#popoverHideImageSrc = popoverHideImageSrc;
        if (mouseenterDelay !== undefined) {
            this.#mouseenterDelay = Number(mouseenterDelay);
        }
        if (mouseleaveDelay !== undefined) {
            this.#mouseleaveDelay = Number(mouseleaveDelay);
        }
        this.#popoverElement = document.createElement('x-popover');
        thisElement.setAttribute('role', 'button');
        thisElement.addEventListener('click', this.#clickEvent);
        thisElement.addEventListener('mouseenter', this.#mouseEnterEvent, { passive: true });
        thisElement.addEventListener('mouseleave', this.#mouseLeaveEvent, { passive: true });
        /* Image preload */
        if (popoverHideImageSrc !== undefined &&
            !popoverHideImageSrc.trimStart().startsWith('data:') &&
            document.querySelector(`link[rel="preload"][href="${popoverHideImageSrc}"]`) === null) {
            const preloadElement = document.createElement('link');
            preloadElement.rel = 'preload';
            preloadElement.as = 'image';
            preloadElement.href = popoverHideImageSrc;
            const alreadyHeadLinkElements = document.head.querySelectorAll('link');
            if (alreadyHeadLinkElements.length === 0) {
                document.head.appendChild(preloadElement);
            }
            else {
                [...alreadyHeadLinkElements].at(-1)?.insertAdjacentElement('afterend', preloadElement);
            }
        }
    }
    /**
     * `click` event
     *
     * @param ev - MouseEvent
     */
    #clickEvent = (ev) => {
        ev.preventDefault();
        clearTimeout(this.#mouseleaveTimeoutId);
        this.#show();
    };
    /**
     * `mouseenter` event
     */
    #mouseEnterEvent = () => {
        clearTimeout(this.#mouseleaveTimeoutId);
        this.#mouseenterTimeoutId = setTimeout(() => {
            this.#show();
        }, this.#mouseenterDelay);
    };
    /**
     * `mouseleave` event
     */
    #mouseLeaveEvent = () => {
        clearTimeout(this.#mouseenterTimeoutId);
        this.#mouseleaveTimeoutId = setTimeout(() => {
            this.#hide();
        }, this.#mouseleaveDelay);
    };
    /**
     * ポップオーバーを生成する
     */
    #create() {
        const popoverElement = this.#popoverElement;
        if (this.#popoverClass !== undefined) {
            popoverElement.className = this.#popoverClass;
        }
        popoverElement.label = this.#popoverLabel ?? null;
        popoverElement.hideText = this.#popoverHideText ?? null;
        popoverElement.hideImageSrc = this.#popoverHideImageSrc ?? null;
        popoverElement.insertAdjacentHTML('afterbegin', this.#footnoteElement.innerHTML);
        document.body.appendChild(popoverElement);
        popoverElement.addEventListener('mouseenter', () => {
            clearTimeout(this.#mouseleaveTimeoutId);
            this.#mouseenterTimeoutId = setTimeout(() => {
                this.#show();
            }, this.#mouseenterDelay);
        }, { passive: true });
        popoverElement.addEventListener('mouseleave', () => {
            clearTimeout(this.#mouseenterTimeoutId);
            this.#mouseleaveTimeoutId = setTimeout(() => {
                this.#hide();
            }, this.#mouseleaveDelay);
        }, { passive: true });
    }
    /**
     * ポップオーバーを表示する
     */
    #show() {
        const popoverElement = this.#popoverElement;
        if (!popoverElement.isConnected) {
            /* 初回表示時はポップオーバーの生成を行う */
            this.#create();
        }
        const triggerRect = this.#popoverTriggerElement.getBoundingClientRect();
        /* ポップオーバーの上位置を設定（トリガー要素の下端を基準にする） */
        popoverElement.style.width = 'auto';
        popoverElement.style.top = `${String(Math.round(triggerRect.bottom) + window.pageYOffset)}px`;
        popoverElement.style.right = 'auto';
        popoverElement.style.left = 'auto';
        /* ポップオーバーを表示 */
        popoverElement.dispatchEvent(new CustomEvent('toggle', {
            detail: {
                newState: 'open',
            },
        }));
        /* ポップオーバーの左右位置を設定（トリガー要素の左端を基準にする） */
        const documentWidth = document.documentElement.offsetWidth;
        const popoverWidth = popoverElement.width;
        const triggerRectLeft = triggerRect.left;
        popoverElement.style.width = `${String(popoverWidth)}px`;
        if (documentWidth - triggerRectLeft < popoverWidth) {
            popoverElement.style.right = '0';
        }
        else {
            popoverElement.style.left = `${String(triggerRectLeft)}px`;
        }
    }
    /**
     * ポップオーバーを非表示にする
     */
    #hide() {
        const popoverElement = this.#popoverElement;
        popoverElement.dispatchEvent(new CustomEvent('toggle', {
            detail: {
                newState: 'closed',
            },
        }));
    }
}
//# sourceMappingURL=FootnoteReferencePopover.js.map