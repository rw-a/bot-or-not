const MIN_FRAME_DURATION = 16;

export default class TextTyper {
    el: HTMLElement
    queue: string
    lastAnimationTime: DOMHighResTimeStamp | undefined
    frameRequest: number
    // @ts-ignore
    resolve: (value?: void) => void

    constructor(el: HTMLElement) {
        this.el = el;

        this.queue = "";
        this.frameRequest = 0;
        this.lastAnimationTime = undefined;

        this.update = this.update.bind(this);
    }

    setText(newText: string) {
        const promise = new Promise<void>(resolve => this.resolve = resolve);

        // Don't bother doing animation if new text is blank
        if (newText.length === 0) {
            return promise;
        }

        // Clear text
        this.el.innerText = "‎";

        // Make newText the target
        this.queue = newText;

        // Cancel any currently running animation
        cancelAnimationFrame(this.frameRequest);

        // Start a new animation
        this.lastAnimationTime = undefined;
        requestAnimationFrame(this.update);

        return promise;
    }

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

        // Move one char from queue to element text
        // If the char is a white space, recursively add another char until a non-whitespace is added
        let toAppend = ""; 
        do {
            if (this.queue.length === 0) {
                break;
            }

            toAppend += this.queue[0];
            this.queue = this.queue.slice(1);
        } while (toAppend.trim().length === 0);
        
        this.el.innerText += toAppend;

        if (this.queue.length > 0) {
            // If not done
            this.frameRequest = requestAnimationFrame(this.update);
        } else {
            // If done
            this.resolve();
        }
    }
}