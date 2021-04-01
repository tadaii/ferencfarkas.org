import App from './App.svelte'

const target = document.getElementById('catalogue-app')
let app = {}

if (target) {
	app = new App({
		target,
		props: {
			workId: target.getAttribute('data-work-id')
		}
	})
}

export default app