export type Gender = 'male' | 'female' | undefined

const ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
]
const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times']

function pick(gender: Gender, male: string, female: string, neutral: string): string {
  return gender === 'male' ? male : gender === 'female' ? female : neutral
}

/** "great-great-" for small counts, "5× great-" beyond that. */
function greats(count: number): string {
  if (count <= 0) return ''
  if (count <= 3) return 'great-'.repeat(count)
  return `${count}× great-`
}

/**
 * Name what B is to A, given the nearest common ancestor.
 * `up` is the number of generations from A up to that ancestor,
 * `down` the number from the ancestor down to B.
 */
export function describeRelation(up: number, down: number, gender: Gender, half = false): string {
  if (up === 0 && down === 0) return 'the same person'

  if (down === 0) {
    if (up === 1) return pick(gender, 'father', 'mother', 'parent')
    return `${greats(up - 2)}grand${pick(gender, 'father', 'mother', 'parent')}`
  }
  if (up === 0) {
    if (down === 1) return pick(gender, 'son', 'daughter', 'child')
    return `${greats(down - 2)}grand${pick(gender, 'son', 'daughter', 'child')}`
  }

  const prefix = half ? 'half-' : ''
  if (up === 1 && down === 1) return prefix + pick(gender, 'brother', 'sister', 'sibling')
  if (up === 1) {
    const base = pick(gender, 'nephew', 'niece', 'nephew or niece')
    return prefix + (down === 2 ? base : `${greats(down - 3)}grand-${base}`)
  }
  if (down === 1) {
    const base = pick(gender, 'uncle', 'aunt', 'uncle or aunt')
    return prefix + (up === 2 ? base : `${greats(up - 2)}${base}`)
  }

  const degree = Math.min(up, down) - 1
  const removed = Math.abs(up - down)
  const ordinal = ORDINALS[degree - 1] ?? `${degree}th`
  const times = removed === 0 ? '' : ` ${TIMES[removed] ?? `${removed} times`} removed`
  return `${prefix}${ordinal} cousin${times}`
}
