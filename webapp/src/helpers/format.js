export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds - h * 3600) / 60)
  const s = Math.floor(seconds - h * 3600 - m * 60)

  let str = ''

  if (h > 0) str += `${h}h `
  if (m > 0) str += `${m}′ `
  if (s > 0) str += `${s}″`

  return str
}

export function formatDate(date) {
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
