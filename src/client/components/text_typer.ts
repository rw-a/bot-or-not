const ANIMATION_TOTAL_DURATION = 500;   // How long each animation should be (ms)

export default class TextTyper {
    el: HTMLElement         // The HTML element which is being animated on
    queue: string           // The characters that still need to be typed out
    currentText: string     // The characters that have already been typed out
    lastAnimationTime: DOMHighResTimeStamp | undefined  //  The time of the last made update
    frameRequest: number    // The frame number of the last made update
    frameDuration: number   // How long each animation frame is (ms)
    // @ts-ignore
    resolve: (value?: void) => void

    constructor(el: HTMLElement) {
        // Prevent element from changing width
        el.style.width = el.clientWidth + "px";
        el.style.whiteSpace = "nowrap";

        this.el = el;

        this.currentText = "";
        this.queue = "";
        this.frameRequest = 0;
        this.lastAnimationTime = undefined;
        this.frameDuration = 32;

        this.update = this.update.bind(this);
    }

    setText(newText: string) {
        const promise = new Promise<void>(resolve => this.resolve = resolve);

        // Don't bother doing animation if new text is blank
        if (newText.length === 0) {
            return promise;
        }

        // Clear text (have invisible character so the space is still taken up)
        this.el.innerHTML = "▌" + `<span style="visibility: hidden">${newText.slice(1)}</span>`;

        // Make newText the target
        this.queue = newText;

        // Set speed such that total animation length is always roughly the same
        this.frameDuration = Math.floor(ANIMATION_TOTAL_DURATION / newText.replace(" ", "").length);

        // Cancel any currently running animation
        this.cancel();

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
        if (timestamp - this.lastAnimationTime > this.frameDuration) {
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
        
        this.currentText += toAppend;

        // Pad the text so that the element's width remains the same
        // Relies on the font being monospace
        this.el.innerHTML = this.currentText + "▌"
            + '<span style="visibility: hidden">' + "o".repeat(Math.max(this.queue.length - 1, 0)); + '</span>';

        if (this.queue.length > 0) {
            // If not done
            this.frameRequest = requestAnimationFrame(this.update);
        } else {
            // If done
            this.el.innerHTML = this.currentText;
            // @ts-ignore
            this.el.style.width = null;
            this.resolve();
        }
    }

    cancel() {
        cancelAnimationFrame(this.frameRequest);
    }
}