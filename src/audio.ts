type MaybeAudio = HTMLAudioElement | null;

export enum AudioState {
	UNLOADED = 0,
	IDLE,
	PLAYING,
}

export class AudioElement {
	audio: MaybeAudio = null;
	state: AudioState = AudioState.UNLOADED;

	constructor(path: string, volume?: number) {
		this.audio = new Audio(path);
		this.audio.preload = "auto";
		this.audio.volume = volume ? volume : 1.0;
		this.state = AudioState.IDLE;

		this.audio.addEventListener("ended", () => {
			this.state = AudioState.IDLE;
		});
	}

	setPosition(index: number) {
		if (!this.audio) return;
		this.audio.currentTime = index;
	}

	setVolume(volume: number) {
		if (!this.audio) return;
		if (volume < 0 || volume > 1) {
			console.warn(`Audio volume ${volume} not in range [0, 1].`);
		}
		this.audio.volume = volume;
	}

	play() {
		if (!this.audio) return;
		this.audio.play().catch(() => {});
		this.state = AudioState.PLAYING;
	}
}

export type MaybeAudioElement = AudioElement | null;
