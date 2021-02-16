import App from './App.svelte'

const target = document.getElementById('catalogue-app')
let app = {}

if (target) {
	app = new App({ target })
}

export default app