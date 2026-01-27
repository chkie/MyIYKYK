<script lang="ts">
	import { t } from '$lib/copy/index.js';

	interface Props {
		form?: {
			error?: string;
		} | null;
	}

	let { form = null }: Props = $props();
</script>

<svelte:head>
	<title>{t('pageTitle.login')}</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<h1>{t('login.title')}</h1>

		<form method="POST" class="login-form">
			<!-- Hidden username field for Apple Keychain / Password Manager integration -->
			<input
				type="hidden"
				name="username"
				value="admin"
				autocomplete="username"
			/>

			<div class="form-group">
				<label for="password">{t('login.passwordLabel')}</label>
				<input
					type="password"
					id="password"
					name="password"
					enterkeyhint="done"
					autocomplete="current-password webauthn"
					required
				/>
			</div>

			{#if form?.error}
				<div class="error-message">
					{form.error}
				</div>
			{/if}

			<button type="submit" class="btn-primary">{t('login.submitButton')}</button>
		</form>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 1rem;
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		padding: 2rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h1 {
		margin: 0 0 1.5rem 0;
		font-size: 1.75rem;
		text-align: center;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 500;
		font-size: 0.875rem;
		color: #374151;
	}

	input[type='password'] {
		width: 100%;
		padding: 0.625rem 0.75rem;
		font-size: 1rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		transition: border-color 0.15s;
	}

	input[type='password']:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.btn-primary {
		width: 100%;
		padding: 0.625rem 1rem;
		font-size: 1rem;
		font-weight: 500;
		color: white;
		background: #3b82f6;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-primary:active {
		background: #1d4ed8;
	}

	.error-message {
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	/* Mobile-first: already optimized for mobile */
	/* Optional: Larger screens */
	@media (min-width: 768px) {
		.login-card {
			padding: 2.5rem;
		}

		h1 {
			font-size: 2rem;
		}
	}
</style>

