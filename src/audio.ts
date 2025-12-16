type MaybeAudio = HTMLAudioElement | null;

export enum AudioState {
	UNLOADED = 0,
	IDLE,
	PLAYING,
}

export class AudioElement {
	audio: MaybeAudio = null;
	state: AudioState = AudioState.UNLOADED;

	constructor(path: string) {
		this.audio = new Audio(path);
		this.audio.preload = "auto";
		this.state = AudioState.IDLE;

		this.audio.addEventListener("ended", () => {
			this.state = AudioState.IDLE;
		});
	}

	setPosition(index: number) {
		if (!this.audio) return;
		this.audio.currentTime = index;
	}

	play() {
		if (!this.audio) return;
		this.audio.play().catch(() => {});
		this.state = AudioState.PLAYING;
	}
}

export type MaybeAudioElement = AudioElement | null;
