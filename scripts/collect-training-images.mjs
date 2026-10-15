import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dataset/tennis-ball')
const commonsApi = 'https://commons.wikimedia.org/w/api.php'
const perClassLimit = 50
const minDimension = 320
const allowedLicense = /(CC0|public domain|CC BY(?:-SA)?\s*[1-4](?:\.0)?)/i
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const reviewedExclusions = new Set([
  'Tennis ball on ground.jpg',
  '20180706 Garriott Juggling Johnson Space Center.jpg',
  'A tennis ball is seen in the Rose Garden of the White House, 2021-03-04 (51033393847).jpg',
  'Autograph ball (46174897744).jpg',
  'Balles officielles Roland Garros 2011.jpg',
  'Cans of tennis balls.jpg',
  'Cmglee tennis ball interior.jpg',
  'Conti echo 23 tennisball.jpg',
  'Court Centrale (22604343548).jpg',
  'Cricket Tennis Ball Vibro.JPG',
  'EVD-tenis-090.jpg',
  'Flying through the water! (Unsplash).jpg',
  'Hawk eye pupil CNE.jpg',
  'Hawk-eye.svg',
  'Light tennis cricket ball.jpg',
  'allium lucy ball pink flower head 2236px.jpg',
  'Ball-kid 2010 Australian Open.jpg',
  'Annika Beck 2, 2015 Wimbledon Qualifying - Diliff.jpg',
  '2015 US Open Tennis Qualies - A Ball Person (20999652422).jpg',
  '2015 US Open Tennis Qualies Ball Persons waiting to take the court (bet).jpg',
  '2015 US Open Tennis Qualies - A Ball Person (20983269176).jpg',
  '2015 US Open Tennis Qualies Ball Boy (20391257284).jpg',
  '2017 US Open Tennis Ball Girl holding her finger behind her back 37073.jpg',
  '2013 US Open Tennis (9646891265).jpg',
  'Dana Mathewson American Wheelchair Tennis Player at the Wilson Photoshoot.jpg',
  'Dana Mathewson American Wheelchair Tennis Player Wilson Photoshoot.jpg',
  'Commander with tennis ball, 20 January 2022.jpg',
  'Commander with ball, 18 February 2022.jpg',
  'Commander with tennis ball, 21 January 2022.jpg',
  'Commander with ball, 18 February 2022 (1).jpg',
  'Alize Cornet 7517496604.jpg',
  'Alize Cornet 7517496604 (cropped).jpg',
  'Ana Ivanovic Eastbourne 2011 5986584362.jpg',
  'Ana Ivanovic Eastbourne 2011 5986620690.jpg',
  'Ana Ivanovic Eastbourne 2011 5986623606.jpg',
  'Ana Ivanovic Eastbourne 2011 5986626252.jpg',
  'Ana Ivanovic Eastbourne 2011 5986627672.jpg',
  'Ana Ivanovic Eastbourne 2011 5986646338.jpg',
  'Ana Ivanovic Eastbourne 2011 5986649132.jpg',
  'Ana Ivanovic Eastbourne 2011 5986657744.jpg',
])
const reviewedPositiveTitles = new Set([
  'A type of tennis ball.jpg',
  'Anyone? (598098803).jpg',
  'Balles.JPG',
  'Ben Shelton.png',
  'Closeup of a tennis ball (2).jpg',
  'Cmglee tennis balls.jpg',
  'Día de padel (4387262971).jpg',
  'Do you like tennis? (500891469).jpg',
  'EVD-tenis-037.jpg',
  'Frozen tennis ball.jpg',
  'Galaxy Sports - Flickr - aloshbennett.jpg',
  'Grass court season is here! (18161963964).jpg',
  'Dog with tennis ball 01.jpg',
  'Dog with tennis ball 02.jpg',
  'Dachshund catching tennis ball.jpg',
  'Ball (4728613105).jpg',
])
const reviewedBallKidTitles = new Set([
  '2014 US Open (Tennis) - Qualifying Rounds (14835679230).jpg',
])
const reviewedStopSignTitles = new Set([
  '2022 IDEAL Mini school protests stop sign.jpg',
  'Blackfoot Language Stop Sign.jpg',
  'Brazzaville Congo panneau de signalisation routière.jpg',
  'Freedom of expression (50181757877).jpg',
  'January 2024, Seattle, Washington, US - 43.jpg',
  'March 2024 in Seattle, Washington - 54.jpg',
  'Portland, Oregon (July 2023) - 159.jpg',
  'Portland, Oregon in May 2025 - 044.jpg',
  'Portland, Oregon, US - August 2025 - 156.jpg',
  'Seattle, November 2023 - 01.jpg',
  'Seattle, WA - June 2023 - 19.jpg',
  'Stop (14701849084).jpg',
  'Stop (5663583349).jpg',
])
const reviewedAppleTitles = new Set([
  "'Claque pépin'.jpg",
  "02-'Diva’ apple, a cultivar developed for cider production. Photo by S. Khanizadeh.tif",
  '16.8.20 1 Borovany Poklady z diecéze 154 (50236237482).jpg',
  '2013. Крым 069.jpg',
  '2013. Крым 864.jpg',
  '2015, Fair Smaki Regionow, Poznan (apples, UEP Poznan).JPG',
  'A red apple rests on a wooden surface showcasing a small hole that adds character.jpg',
  'A rotting apple (6269439597).jpg',
  'An apple a day (151245827).jpg',
  'apelbaru.png',
  'apfel-6.jpg',
  'apole.jpg',
  'apple-2020-12-11.jpg',
  'Apple (511354151).jpg',
  'Apple (Malus domestica) (19719834878).jpg',
])
const categories = [
  { category: 'Tennis_balls', search: 'filetype:bitmap tennis ball', directory: 'positive', filePrefix: 'positive', split: 'positive', label: 'tennis_ball', limit: reviewedPositiveTitles.size, reviewedTitles: reviewedPositiveTitles },
  { category: 'Tennis_ball_boys_and_girls', directory: 'positive', filePrefix: 'ballkid', split: 'positive', label: 'tennis_ball', limit: reviewedBallKidTitles.size, reviewedTitles: reviewedBallKidTitles },
  { category: 'Stop_signs', directory: 'negative/stop-signs', filePrefix: 'stop-sign', split: 'negative', label: 'no_ball', limit: reviewedStopSignTitles.size, reviewedTitles: reviewedStopSignTitles },
  { category: 'Apples', directory: 'negative/apples', filePrefix: 'apple', split: 'negative', label: 'no_ball', limit: reviewedAppleTitles.size, reviewedTitles: reviewedAppleTitles },
]

function clean(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim()
}

function safeName(value) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 70) || 'commons-image'
}

async function commonsFetch(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': 'BallVisionDatasetCollector/1.0 (local training dataset)' } })
    if (response.status !== 429 && response.status < 500) return response
    const retryAfter = Number(response.headers.get('retry-after'))
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 1500)
  }
  throw new Error('Wikimedia Commons API kept rate limiting the request')
}

async function getCategoryFiles(category) {
  const files = []
  let continuation = ''
  for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
    const url = new URL(commonsApi)
    url.search = new URLSearchParams({
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: `Category:${category}`,
      gcmtype: 'file',
      gcmlimit: '100',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '800',
      format: 'json',
      origin: '*',
      ...(continuation ? { gcmcontinue: continuation } : {}),
    })
    const response = await commonsFetch(url)
    if (!response.ok) throw new Error(`Commons API returned ${response.status} for ${category}`)
    const data = await response.json()
    files.push(...Object.values(data.query?.pages ?? {}))
    continuation = data.continue?.gcmcontinue
    if (!continuation) break
  }
  return files.sort((a, b) => a.title.localeCompare(b.title))
}

async function getSearchFiles(search) {
  const files = []
  let continuation = ''
  for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
    const url = new URL(commonsApi)
    url.search = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: search,
      gsrnamespace: '6',
      gsrlimit: '100',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '800',
      format: 'json',
      origin: '*',
      ...(continuation ? { gsroffset: continuation } : {}),
    })
    const response = await commonsFetch(url)
    if (!response.ok) throw new Error(`Commons search returned ${response.status} for ${search}`)
    const data = await response.json()
    files.push(...Object.values(data.query?.pages ?? {}))
    continuation = data.continue?.gsroffset
    if (!continuation) break
  }
  return files
}

async function collectGroup(group) {
  const outputDir = path.join(root, group.directory)
  await mkdir(outputDir, { recursive: true })
  for (const existing of await readdir(outputDir)) {
    if (existing.startsWith(`${group.filePrefix}_`)) await rm(path.join(outputDir, existing))
  }
  const categoryPages = await getCategoryFiles(group.category)
  const searchPages = group.search ? await getSearchFiles(group.search) : []
  const pages = [...new Map([...categoryPages, ...searchPages].map((page) => [page.title, page])).values()]
  const records = []

  for (const page of pages) {
    if (records.length >= group.limit) break
    const info = page.imageinfo?.[0]
    if (!info?.thumburl || (info.mime && !info.mime.startsWith('image/'))) continue
    if (Math.min(info.thumbwidth ?? 0, info.thumbheight ?? 0) < minDimension) continue

    const metadata = info.extmetadata ?? {}
    const license = clean(metadata.LicenseShortName?.value)
    if (!allowedLicense.test(license)) continue

    const description = clean(metadata.ImageDescription?.value)
    const categories = clean(metadata.Categories?.value)
    const title = page.title.replace(/^File:/, '')
    if (group.reviewedTitles && !group.reviewedTitles.has(title)) continue
    if (reviewedExclusions.has(title)) continue
    if (group.split === 'positive' && !/tennis balls|tennis ball boys|tennis ball girls|tennis ballkids/i.test(categories)) continue
    if (group.split === 'positive' && /bestanddeelnr|fabricage|viltbekleding|fabriek|stanzen|hermetisch|1919|advert|bzn.{0,15}1923|3d|abstract|aktion tennisball|augusto de luca|autoretrato|ball ofthe street|beauty battles|balles.officielles.roland.garros.2011\s*\(2\)|strobe|diagram|illustration|cartoon|logo|icon|vector|allium|table.tennis|ball.free.fall/i.test(`${title} ${description}`)) continue
    const filename = `${group.filePrefix}_${String(records.length + 1).padStart(3, '0')}_${safeName(title)}.jpg`
    let imageResponse
    try {
      imageResponse = await fetch(info.thumburl, { headers: { 'User-Agent': 'BallVisionDatasetCollector/1.0' } })
    } catch (error) {
      console.warn(`Skip ${title}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!imageResponse.ok) {
      console.warn(`Skip ${title}: image server returned ${imageResponse.status}`)
      continue
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const mime = imageResponse.headers.get('content-type') ?? info.mime
    const extension = mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg'
    const savedName = filename.replace(/\.jpg$/, extension)
    await writeFile(path.join(outputDir, savedName), imageBuffer)
    records.push({
      filename: savedName,
      directory: group.directory,
      split: group.split,
      label: group.label,
      sourceTitle: title,
      sourcePage: info.descriptionurl,
      originalUrl: info.url,
      artist: clean(metadata.Artist?.value),
      license,
      licenseUrl: metadata.LicenseUrl?.value ?? '',
      description,
      width: info.thumbwidth,
      height: info.thumbheight,
      fileType: mime,
      annotated: false,
    })
    console.log(`${records.length}/${group.limit} ${savedName} — ${license}`)
    await wait(150)
  }
  return records
}

const allRecords = []
for (const group of categories) {
  console.log(`Collecting ${group.category} (${group.split})...`)
  allRecords.push(...await collectGroup(group))
}

await writeFile(path.join(root, 'manifest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'Wikimedia Commons category files; each record includes its original source and license.',
  warning: 'This is a starter collection, not a fully annotated or validated training set. Review every image and draw object bounding boxes before training.',
  records: allRecords,
}, null, 2))

const csv = ['filename,split,label,xmin,ymin,xmax,ymax,annotated']
  .concat(allRecords.map((item) => `${item.directory}/${item.filename},${item.split},${item.label},,,,,false`))
  .join('\n') + '\n'
await writeFile(path.join(root, 'annotations.csv'), csv)
console.log(`Done: ${allRecords.length} images saved under ${root}`)
