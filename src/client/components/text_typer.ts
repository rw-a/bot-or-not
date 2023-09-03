const MIN_FRAME_DURATION = 16;

export default class TextTyper {
    el: HTMLElement
    queue: string
    lastAnimationTime: DOMHighResTimeStamp | undefined
    frameRequest: number
    // @ts-ignore
    resolve: (value?: unknown) => void

    constructor(el: HTMLElement) {
        this.el = el;

        this.queue = "";
        this.frameRequest = 0;
        this.lastAnimationTime = undefined;

        this.update = this.update.bind(this);
    }

    setText(newText: string) {
        const promise = new Promise(resolve => this.resolve = resolve);

        // Don't bother doing animation if new text is blank
        if (newText.length === 0) {
            return promise;
        }

        // Clear text
        this.el.innerText = "";

        // Make newText the target
        this.queue = newText;

        // Cancel any currently running animation
        cancelAnimationFrame(this.frameRequest);

        // Start a new animation
        this.lastAnimationTime = undefined;
        requestAnimationFrame(this.update);

        return promise;
    }

    /*
    * Precondition: this.queue.length > 0
    */
    update(timestamp: DOMHighResTimeStamp) {
        // Set when the animation has started
        if (this.lastAnimationTime === undefined) {
            this.lastAnimationTime = timestamp;
        }

        // Limit animation speed
        if (timestamp - this.lastAnimationTime > MIN_FRAME_DURATION) {
            this.lastAnimationTime = timestamp;
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            return;
        }

        // Move char from queue to element text
        this.el.innerText += this.queue[0];
        this.queue = this.queue.slice(1);


        if (this.queue.length > 0) {
            // If not done
            this.frameRequest = requestAnimationFrame(this.update);
        } else {
            // If done
            this.resolve();
        }
    }
}