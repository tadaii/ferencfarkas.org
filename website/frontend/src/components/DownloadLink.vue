<template>
  <a
    class="DownloadLink"
    :href="target"
    target="_blank"
  >
    <svg>
      <path d="M 10.116206939332534 20 L 0 20 L 0 17.887619047619182 L 20 17.887619047619182 L 20 20 L 10.116206939332534 20 Z  M 3.295149083991564 10.571428571428669 L 3.295149083991564 5.840952380952444 L 8.132831561970143 11.472380952381059 L 8.132831561970143 0 L 11.08308175840536 0 L 11.08308175840536 11.469523809523821 L 15.92076423638394 5.838095238095207 L 15.92076423638394 10.568571428571431 L 9.613332781936231 17.793333333333408 L 3.295149083991564 10.571428571428669 Z" />
    </svg>
    <div class="download__texts">
      <span class="download__title">{{ title }}</span>
      <span class="download__meta">{{ type }}, {{ size }}, {{ countDownloads }}</span>
    </div>
  </a>
</template>

<script>
export default {
  name: 'DownloadLink',

  props: {
    target: {
      type: String,
      default: '#'
    },

    type: {
      type: String,
      default: 'unknown'
    },

    title: {
      type: String,
      default: 'Download'
    },

    size: {
      type: [Number, String],
      default: 0
    },

    countDownloads: {
      type: [Number, String],
      default: 0
    }
  }
}
</script>

<style lang="postcss">
.DownloadLink {
  display: flex;
  margin: 30px 0 15px;
  color: $c-secondary-dark;

  svg {
    width: 20px;
    height: 20px;
    margin: 5px 10px 0 0;
    fill: $c-secondary-dark;

    @include media-breakpoint-up(lg) {
      margin-right: 15px;
    }
  }

  &__texts {
    display: flex;
    flex-direction: column;
  }

  &__meta {
    font-size: 90%;
    font-weight: 300;
    color: $c-black;
    opacity: .6;
  }

  Section.highlight &,
  Section.focus & {
    color: $c-white;

    svg {
      fill: $c-white;
    }
  }

  Section.invert & {
    color: $c-primary;

    svg {
      fill: $c-primary;
    }

    .download__meta {
      color: $c-white;
    }
  }
}
</style>
