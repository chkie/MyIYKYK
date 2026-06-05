/** Native-feel Ersatz für window.confirm() — Promise-basiert, eine geteilte Instanz. */
export type ConfirmOptions = {
	/** Optionaler fetter Titel über der Nachricht. */
	title?: string;
	/** Pflicht-Nachricht (kann bereits via t() übersetzt übergeben werden). */
	message: string;
	/** Label des Bestätigen-Buttons. Default: 'Bestätigen' / bei danger 'Löschen'. */
	confirmLabel?: string;
	/** Label des Abbrechen-Buttons. Default: 'Abbrechen'. */
	cancelLabel?: string;
	/** Destruktiv → roter Bestätigen-Button + Impact-Haptik. Default: false. */
	danger?: boolean;
};

class ConfirmController {
	open = $state(false);
	options = $state<ConfirmOptions | null>(null);
	#resolve: ((value: boolean) => void) | null = null;

	/** Öffnet das Sheet und resolved mit true (bestätigt) / false (abgebrochen). */
	ask(options: ConfirmOptions): Promise<boolean> {
		// Falls noch eins offen ist: das alte als abgebrochen abschließen.
		this.#settle(false);
		this.options = options;
		this.open = true;
		return new Promise<boolean>((resolve) => {
			this.#resolve = resolve;
		});
	}

	confirm() {
		this.#settle(true);
	}

	cancel() {
		this.#settle(false);
	}

	#settle(value: boolean) {
		if (!this.#resolve) return; // idempotent — Mehrfach-Settle (Button + close-Event) no-op
		this.open = false;
		const resolve = this.#resolve;
		this.#resolve = null;
		resolve(value);
	}
}

/**
 * Geteilte Singleton-Instanz. NUR aus Client-Event-Handlern aufrufen — niemals
 * während SSR/load: das Modul-Level-$state wird auf dem Server über Requests
 * geteilt, ein SSR-seitiges open=true würde zwischen Requests lecken.
 */
export const confirmController = new ConfirmController();

/** Ergonomischer window.confirm()-Ersatz: `if (await askConfirm({ message })) { ... }`. */
export const askConfirm = (options: ConfirmOptions): Promise<boolean> =>
	confirmController.ask(options);
