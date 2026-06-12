/**
 * Onboarding store — drives first-launch tour, first-budget guide,
 * and the keyboard-shortcut dialog (all opened from Settings → Help).
 *
 * Persist keys: eq_toured, eq_budget_guided
 * init() is NOT needed — visibility is set reactively; call
 * maybeShowTourOnLaunch() once from +layout.svelte onMount.
 */

class OnboardingStore {
	showTour = $state(false);
	showBudgetGuide = $state(false);
	showShortcuts = $state(false);

	// ── Tour ─────────────────────────────────────────────────────────────────

	/** Called once on app mount. Shows the tour if the user has never seen it. */
	maybeShowTourOnLaunch() {
		if (!localStorage.getItem('eq_toured')) this.showTour = true;
	}

	dismissTour() {
		this.showTour = false;
		localStorage.setItem('eq_toured', 'true');
	}

	/** Settings → App Tour "Show again" */
	replayTour() {
		localStorage.removeItem('eq_toured');
		this.showTour = true;
	}

	// ── Budget guide ──────────────────────────────────────────────────────────

	/** Called from the budget form when the loaded budget's record count is known. */
	maybeShowBudgetGuide(isEmpty: boolean) {
		if (isEmpty && !localStorage.getItem('eq_budget_guided')) this.showBudgetGuide = true;
	}

	dismissBudgetGuide() {
		this.showBudgetGuide = false;
		localStorage.setItem('eq_budget_guided', 'true');
	}

	/** Settings → Budget Guide "Show again" */
	replayBudgetGuide() {
		localStorage.removeItem('eq_budget_guided');
		this.showBudgetGuide = true;
	}
}

export const onboardingStore = new OnboardingStore();
