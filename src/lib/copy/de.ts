/**
 * Deutsche UI-Texte (Zentrale Copy-Quelle)
 *
 * Regeln:
 * - Keys stabil & sprechend (z.B. expense.add.title)
 * - Strings identisch zum Original (1:1 Migration)
 * - Parameter: {variableName} für dynamische Werte
 */
export const de = {
	// ========================================
	// Common Actions (häufigste Buttons)
	// ========================================
	common: {
		save: 'Speichern',
		cancel: 'Abbrechen',
		delete: 'Löschen',
		edit: 'Bearbeiten',
		add: 'Hinzufügen',
		close: 'Schließen',

		// Loading States
		saving: 'Speichert...',
		loading: 'Lädt...',
		adding: 'Hinzufügt...',
		closing: 'Schließt ab...',
		deleting: 'Löscht...',
		resetting: 'Zurücksetzen...'
	},

	// ========================================
	// Navigation
	// ========================================
	nav: {
		overview: 'Übersicht',
		fixedCosts: 'Fixkosten',
		expenses: 'Ausgaben',
		profile: 'Profil',
		archive: 'Archiv',
		logout: 'Logout'
	},

	// ========================================
	// Form Labels & Inputs
	// ========================================
	form: {
		amount: 'Betrag (€)',
		amountShort: 'Betrag',
		description: 'Beschreibung',
		date: 'Datum',
		label: 'Bezeichnung',
		categoryName: 'Kategorie Name',

		// Placeholders
		amountPlaceholder: '0.00',
		descriptionPlaceholder: 'z.B. Einkaufen, Restaurant, Tanken...',
		categoryPlaceholder: 'z.B. Wohnung, Auto, Versicherungen...',
		itemPlaceholder: 'z.B. Miete, Strom...',

		// Split Modes
		splitMode: 'Aufteilung',
		splitModeIncome: 'Einkommen',
		splitModeHalf: '50/50',
		splitModeMe: 'Christian',
		splitModePartner: 'Steffi',

		// Split Mode Labels (mit Emojis)
		splitModeLabelIncome: '📊 Einkommen',
		splitModeLabelHalf: '⚖️ 50/50',
		splitModeLabelMe: '👤 Christian',
		splitModeLabelPartner: '👤 Steffi'
	},

	// ========================================
	// Page Titles (Browser <title>)
	// ========================================
	pageTitle: {
		overview: 'Übersicht - Kosten-Tool',
		fixedCosts: 'Fixkosten - Kosten-Tool',
		expenses: 'Ausgaben - Kosten-Tool',
		profile: 'Profil - Kosten-Tool',
		archive: 'Archiv - Kosten-Tool',
		login: 'Login'
	},

	// ========================================
	// Login Page
	// ========================================
	login: {
		title: 'Login',
		passwordLabel: 'Passwort',
		submitButton: 'Anmelden'
	},

	// ========================================
	// Overview Page (+page.svelte)
	// ========================================
	overview: {
		currentMonth: 'Aktueller Monat',
		statusActive: '✓ Aktiv',
		statusClosed: 'Geschlossen',

		// Hero Status
		youOwe: 'Christian schuldet Steffi',
		owesYou: 'Steffi schuldet Christian',
		allSettled: '✓ Alles ausgeglichen',
		noDebts: 'Keine offenen Schulden',

		// Summary Cards
		fixedCostsLabel: 'Fixkosten',
		prepaymentLabel: 'Vorauszahlung',
		privateExpensesLabel: 'Private',
		previousMonthLabel: 'Vormonat',
		startBalance: 'Startsaldo',
		shareLabel: 'Anteil',
		expensesCount: 'Ausgaben',

		// Prepayment Status
		missing: 'fehlt',
		overpayment: 'mehr',
		exactMatch: '✓ Passt genau',

		// Recommendation Card
		nextMonth: 'Nächster Monat',
		recommendedPrepayment: 'Empfohlene Vorauszahlung:',
		recommendationHint:
			'Christian sollte diesen Betrag an Steffi überweisen, damit Steffi nicht in Vorleistung gehen muss.',

		// Quick Actions
		newExpense: 'Neue Ausgabe',
		income: 'Einkommen',

		// History Section
		historyTitle: 'Monats-Historie',
		historyEntry: 'Eintrag',
		historyEntries: 'Einträge',
		historyShowAll: 'Alle {count} anzeigen',
		historyShowLess: 'Weniger anzeigen',
		historyEmpty: 'Noch keine Einträge',
		historyEmptyHint: 'Positionen erscheinen hier nach dem Anlegen',
		historyPrivate: 'Privat',
		historyFixed: 'Fix'
	},

	// ========================================
	// Fixed Costs Page (fixkosten/+page.svelte)
	// ========================================
	fixedCosts: {
		title: 'Fixkosten',
		myShare: 'Christians Anteil',
		total: 'Gesamt',

		// Category
		newCategory: 'Neue Kategorie',
		categoryDelete: 'Kategorie löschen',
		position: 'Position',
		positions: 'Positionen',

		// Items
		addItem: 'Position hinzufügen',

		// Empty State
		noCategoriesTitle: 'Noch keine Fixkosten-Kategorien vorhanden.',
		noCategoriesHint: 'Füge oben eine neue Kategorie hinzu!'
	},

	// ========================================
	// Expenses Page (ausgaben/+page.svelte)
	// ========================================
	expenses: {
		title: 'Private Ausgaben',
		thisMonth: 'Diesen Monat',
		addNew: 'Neue Ausgabe hinzufügen',
		newExpense: 'Neue Ausgabe',
		editExpense: 'Ausgabe bearbeiten',
		expenseCount: 'Ausgabe',
		expensesCount: 'Ausgaben',

		// Empty State
		noExpensesTitle: 'Noch keine Ausgaben vorhanden',
		noExpensesHint: 'Füge oben eine neue Ausgabe hinzu!'
	},

	// ========================================
	// Profile Selector (ProfileSelector.svelte)
	// ========================================
	profileSelector: {
		welcome: 'Willkommen!',
		whoIsUsing: 'Wer nutzt die App?',
		savedOnDevice: 'Diese Einstellung wird auf diesem Gerät gespeichert'
	},

	// ========================================
	// Profile Page (profil/+page.svelte)
	// ========================================
	profile: {
		title: 'Profil & Einstellungen',

		// Income Card
		incomeTitle: 'Einkommen',
		youLabel: '(Christian)',

		// Prepayment Card
		prepaymentTitle: 'Vorauszahlung',
		recommendation: 'Empfehlung',
		alreadyTransferred: 'Bereits überwiesen',

		// Close Month Card
		closeMonthTitle: 'Monat abschließen',
		closeMonthButton: 'Jetzt abschließen',
		finalBalanceLabel: 'Endsaldo wird übertragen:',

		// Profile Selection Card
		profileSelectionTitle: 'Profil-Einstellung',
		profileSelectionHint: 'Wer nutzt diese App auf diesem Gerät?',
		currentlyLoggedInAs: 'Aktuell angemeldet als:',
		switchProfile: 'Profil wechseln',
		noProfileSelected: 'Kein Profil ausgewählt',

		// Dev Tools
		devToolsTitle: 'Dev Tools',
		resetMonthHint: 'Monat zurücksetzen (alle Daten löschen, nur für Entwicklung!)',
		resetMonthButton: '🗑️ Monat zurücksetzen'
	},

	// ========================================
	// Archive Page (archiv/+page.svelte)
	// ========================================
	archive: {
		title: 'Archiv',
		subtitle: 'Alle abgeschlossenen Monate ({count})',
		finalBalance: 'Endsaldo:',
		closedAt: 'Abgeschlossen am',

		// Empty State
		noArchiveTitle: 'Noch keine archivierten Monate',
		noArchiveHint: 'Abgeschlossene Monate erscheinen hier automatisch'
	},

	// ========================================
	// Confirm Dialogs (KRITISCH!)
	// ========================================
	confirm: {
		deleteExpense: "'{name}' wirklich löschen?",
		deleteItem: "'{name}' wirklich löschen?",
		deleteCategory: "Kategorie '{name}' und alle Positionen wirklich löschen?",
		deleteMonth: 'Monat {month} wirklich löschen?',
		closeMonth: 'Monat wirklich abschließen? Dies erstellt den nächsten Monat!',
		resetMonth: 'ACHTUNG: Alle Daten dieses Monats werden gelöscht! Fortfahren?'
	},

	// ========================================
	// Aria Labels (Accessibility)
	// ========================================
	aria: {
		editIncome: 'Einkommen bearbeiten',
		editPrepayment: 'Vorauszahlung bearbeiten',
		edit: 'Bearbeiten',
		delete: 'Löschen',
		archive: 'Archiv',
		selectSplitMode: 'Aufteilungsmodus wählen',
		appLogo: 'App Logo'
	}
} as const;

export type DeTranslations = typeof de;
