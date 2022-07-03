<script>
  export let size = 50
  export let radius = 20
  export let stroke = 5
</script>

<div class="spinner--wrapper" style="margin-right:-{size / 2}px">
  <svg
    class="spinner animate"
    viewBox="0 0 {size} {size}"
    style="margin:-{size / 2}px 0 0 0;width:{size}px;height:{size}px;"
  >
    <circle
      class="path"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={stroke}
    />
  </svg>
  <svg
    class="spinner"
    viewBox="0 0 {size} {size}"
    style="margin:-{size / 2}px 0 0 0;width:{size}px;height:{size}px;"
  >
    <circle
      class="path"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={stroke}
    />
  </svg>
</div>
