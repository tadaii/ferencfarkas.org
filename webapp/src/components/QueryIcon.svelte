<script>
  import Spinner from './Spinner.svelte'

  export let loading = false
  export let failed = false
</script>

{#if loading}
  <Spinner size="20" radius="8" stroke="2.5" />
{:else if failed}
  <svg class="search--query-icon" viewBox="0 0 44 44">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M11 10L11 10L21.9996 20.9997H21.9996L11 10ZM11 35.4142L21.9996 24.4145L32.9993 35.4142L35.4135 33.0001L24.4134 22L35.4134 10.9999L32.9993 8.58579L21.9996 19.5855L11 8.58579L8.58582 10.9999L19.5859 22L8.58582 33.0001L11 35.4142Z"
      fill="black"
    />
  </svg>
{:else}
  <svg class="search--query-icon" viewBox="0 0 183 183">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M116.734 123.134C107.184 131.23 94.8237 136.113 81.3234 136.113C51.0639 136.113 26.5338 111.583 26.5338 81.3234C26.5338 51.0638 51.0639 26.5337 81.3234 26.5337C111.583 26.5337 136.113 51.0638 136.113 81.3234C136.113 94.8237 131.23 107.184 123.134 116.733L156.466 150.065L150.066 156.466L116.734 123.134ZM126.434 81.3233C126.434 106.237 106.237 126.434 81.3235 126.434C56.4098 126.434 36.2133 106.237 36.2133 81.3233C36.2133 56.4097 56.4098 36.2131 81.3235 36.2131C106.237 36.2131 126.434 56.4097 126.434 81.3233Z"
      fill="currentColor"
    />
  </svg>
{/if}
