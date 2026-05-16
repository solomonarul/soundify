export interface IListening<T> {
	addListener(listener: (value: T) => void): void;
	removeListener(listener: (value: T) => void): void;
}

export abstract class Listening<T> implements IListening<T> {
	private listeners = new Set<(value: T) => void>();

	addListener(listener: (value: T) => void): void {
		this.listeners.add(listener);
	}

	removeListener(listener: (value: T) => void): void {
		this.listeners.delete(listener);
	}

	protected notify(value: T): void {
		for (const listener of this.listeners) listener(value);
	}
}
