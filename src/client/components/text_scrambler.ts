/* 
* ——————————————————————————————————————————————————
* TextScramble
* Based on: https://codepen.io/soulwire/pen/mEMPrK
* ——————————————————————————————————————————————————
*/

interface ScrambleFrame {
    from: string
    to: string
    start: number
    end: number
    char?: string
}

const GRAYED_OUT_COLOR = "#757575";
const CHARS = '!<>-_\\/[]{}—=+*^?#________';

const ANIMATION_FRAME_DURATION = 50;    // How long it takes for the characters to reach the new word
const CHARACTER_SCRAMBLE_RATE = 0.28;   // How fast characters switch randomly
const MIN_FRAME_DURATION = 16;          // Frames must be at least this long (ms), i.e. fps cap (1000 / 60 = 17)

export default class TextScrambler {
    el: HTMLElement
    queue: ScrambleFrame[]
    frame: number
    frameRequest: number
    resolve: (value?: unknown) => void
    lastAnimationTime: DOMHighResTimeStamp | undefined

    constructor(el: HTMLElement) {
        this.el = el;

        // State for each animation step
        this.queue = [];
        this.frame = 0;
        this.frameRequest = 0;
        this.lastAnimationTime = undefined;

        this.update = this.update.bind(this);
    }

    setText(newText: string) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(resolve => this.resolve = resolve);

        // Create the list of character changes required
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * ANIMATION_FRAME_DURATION);
            const end = start + Math.floor(Math.random() * ANIMATION_FRAME_DURATION);
            this.queue.push({ from, to, start, end });
        }

        // Cancel any currently running animation
        cancelAnimationFrame(this.frameRequest);

        // Start a new animation
        this.frame = 0;
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

        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < CHARACTER_SCRAMBLE_RATE) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span style="color: ${GRAYED_OUT_COLOR}">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return CHARS[Math.floor(Math.random() * CHARS.length)];
    }
}