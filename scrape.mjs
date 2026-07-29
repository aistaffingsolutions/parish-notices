// Scrapes RIP.ie recent death notices (from GitHub's IPs — rip.ie blocks Cloudflare)
// and writes per-parish JSON the parish sites read. Runs hourly via GitHub Actions.
import { writeFileSync, mkdirSync } from 'node:fs'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

async function getBuildId() {
  const r = await fetch('https://rip.ie/', { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!r.ok) throw new Error('rip.ie homepage ' + r.status)
  const html = await r.text()
  const m = html.match(/"buildId":"([^"]+)"/)
  if (!m) throw new Error('buildId not found')
  return m[1]
}
async function getRecent(buildId) {
  const r = await fetch(`https://rip.ie/_next/data/${buildId}/en/death-notice/recent.json`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) throw new Error('rip.ie data ' + r.status)
  const d = await r.json()
  return d?.pageProps?.deathNoticeRecentList || []
}
const shape = (n) => ({
  id: n.id, firstname: n.firstname || '', surname: n.surname || '', nee: n.nee || '',
  createdAt: n.createdAt || '', town: n.town?.name || '', county: n.county?.name || '',
  url: `https://rip.ie/death-notice/${n.id}`,
})
function build(all, town) {
  const parish = all.filter((n) => (n.town?.name || '').toLowerCase() === town).map(shape)
  let notices = parish, scope = 'parish'
  if (!notices.length) {
    notices = all.filter((n) => (n.county?.name || '') === 'Limerick').slice(0, 3).map(shape)
    scope = notices.length ? 'limerick' : 'none'
  }
  return { notices: notices.slice(0, 3), scope, updatedAt: new Date().toISOString() }
}

const buildId = await getBuildId()
const all = await getRecent(buildId)
mkdirSync('data', { recursive: true })
writeFileSync('data/cappagh.json', JSON.stringify(build(all, 'cappagh'), null, 2))
writeFileSync('data/croagh.json', JSON.stringify(build(all, 'croagh'), null, 2))
console.log('wrote data/cappagh.json and data/croagh.json;', all.length, 'notices scanned')
