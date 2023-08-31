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

const ANIMATION_FRAME_DURATION = 40;    // Higher = slower
const CHARACTER_SCRAMBLE_RATE = 0.28;   // How fast characters switch

export default class TextScrambler {
    el: HTMLElement
    queue: ScrambleFrame[]
    frame: number
    frameRequest: number
    resolve: (value?: unknown) => void

    constructor(el: HTMLElement) {
        this.el = el;
        this.queue = [];
        this.frame = 0;
        this.frameRequest = 0;

        this.update = this.update.bind(this);
    }

    setText(newText: string) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(resolve => this.resolve = resolve);

        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * ANIMATION_FRAME_DURATION);
            const end = start + Math.floor(Math.random() * ANIMATION_FRAME_DURATION);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
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