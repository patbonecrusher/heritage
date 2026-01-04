#!/usr/bin/env node
/**
 * Create Queen Victoria Family Tree
 *
 * Creates a .heritage bundle with Queen Victoria's descendants,
 * including portraits downloaded from Wikipedia.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const BUNDLE_PATH = path.join(process.env.HOME, 'Documents', 'Queen Victoria.heritage');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');

// Info.plist template
const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.heritage.familytree</string>
    <key>CFBundleName</key>
    <string>Queen Victoria</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleIconFile</key>
    <string>Icon.icns</string>
    <key>HeritageFormatVersion</key>
    <string>2</string>
    <key>HeritageCreatedAt</key>
    <string>${new Date().toISOString()}</string>
    <key>HeritageLastModified</key>
    <string>${new Date().toISOString()}</string>
</dict>
</plist>`;

// Helper to create Wikimedia Commons FilePath URL
const wikiFile = (filename) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=400`;

// Queen Victoria's family data with Wikipedia portrait URLs
const FAMILY_DATA = [
  // Generation 1: Victoria & Albert
  {
    id: 'victoria',
    given_names: 'Victoria',
    surname: 'Hanover',
    gender: 'female',
    birth: { date: '1819-05-24', place: 'Kensington Palace, London, England' },
    death: { date: '1901-01-22', place: 'Osborne House, Isle of Wight, England' },
    portrait: wikiFile('Queen Victoria by Bassano.jpg'),
    notes: 'Queen of the United Kingdom of Great Britain and Ireland (1837-1901). Empress of India (1876-1901).'
  },
  {
    id: 'albert',
    given_names: 'Albert',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'male',
    birth: { date: '1819-08-26', place: 'Rosenau Castle, Coburg, Germany' },
    death: { date: '1861-12-14', place: 'Windsor Castle, Windsor, England' },
    portrait: wikiFile('Prince Albert - Franz Xaver Winterhalter 1842.jpg'),
    notes: 'Prince Consort of Queen Victoria. Known for his interest in education, science, and the arts.'
  },

  // Generation 2: Children of Victoria & Albert
  {
    id: 'victoria_princess',
    given_names: 'Victoria Adelaide Mary Louisa',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'female',
    birth: { date: '1840-11-21', place: 'Buckingham Palace, London, England' },
    death: { date: '1901-08-05', place: 'Friedrichshof Castle, Kronberg, Germany' },
    portrait: wikiFile('Vicky 1867.jpg'),
    notes: 'Princess Royal. German Empress and Queen of Prussia as wife of Frederick III.',
    parents: ['victoria', 'albert']
  },
  {
    id: 'edward_vii',
    given_names: 'Albert Edward',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'male',
    birth: { date: '1841-11-09', place: 'Buckingham Palace, London, England' },
    death: { date: '1910-05-06', place: 'Buckingham Palace, London, England' },
    portrait: wikiFile('Edward VII in coronation robes.jpg'),
    notes: 'King of the United Kingdom and the British Dominions, and Emperor of India (1901-1910).',
    parents: ['victoria', 'albert']
  },
  {
    id: 'alice',
    given_names: 'Alice Maud Mary',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'female',
    birth: { date: '1843-04-25', place: 'Buckingham Palace, London, England' },
    death: { date: '1878-12-14', place: 'Darmstadt, Grand Duchy of Hesse, Germany' },
    portrait: wikiFile('Alice of the United Kingdom.jpg'),
    notes: 'Grand Duchess of Hesse and by Rhine. Mother of Tsarina Alexandra of Russia.',
    parents: ['victoria', 'albert']
  },
  {
    id: 'alfred',
    given_names: 'Alfred Ernest Albert',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'male',
    birth: { date: '1844-08-06', place: 'Windsor Castle, Windsor, England' },
    death: { date: '1900-07-30', place: 'Rosenau Castle, Coburg, Germany' },
    portrait: wikiFile('Alfred, Duke of Edinburgh and of Saxe-Coburg and Gotha (1893).jpg'),
    notes: 'Duke of Edinburgh (1866-1893). Duke of Saxe-Coburg and Gotha (1893-1900).',
    parents: ['victoria', 'albert']
  },
  {
    id: 'helena',
    given_names: 'Helena Augusta Victoria',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'female',
    birth: { date: '1846-05-25', place: 'Buckingham Palace, London, England' },
    death: { date: '1923-06-09', place: 'Schomberg House, London, England' },
    portrait: wikiFile('Princess Helena of the United Kingdom.jpg'),
    notes: 'Princess Christian of Schleswig-Holstein. Active in charitable work and nursing.',
    parents: ['victoria', 'albert']
  },
  {
    id: 'louise',
    given_names: 'Louise Caroline Alberta',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'female',
    birth: { date: '1848-03-18', place: 'Buckingham Palace, London, England' },
    death: { date: '1939-12-03', place: 'Kensington Palace, London, England' },
    portrait: wikiFile('Princess Louise, Duchess of Argyll.jpg'),
    notes: 'Duchess of Argyll. Accomplished sculptor and supporter of higher education for women.',
    parents: ['victoria', 'albert']
  },
  {
    id: 'arthur',
    given_names: 'Arthur William Patrick Albert',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'male',
    birth: { date: '1850-05-01', place: 'Buckingham Palace, London, England' },
    death: { date: '1942-01-16', place: 'Bagshot Park, Surrey, England' },
    portrait: wikiFile('Arthur, Duke of Connaught and Strathearn.jpg'),
    notes: 'Duke of Connaught and Strathearn. Governor General of Canada (1911-1916).',
    parents: ['victoria', 'albert']
  },
  {
    id: 'leopold',
    given_names: 'Leopold George Duncan Albert',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'male',
    birth: { date: '1853-04-07', place: 'Buckingham Palace, London, England' },
    death: { date: '1884-03-28', place: 'Cannes, France' },
    portrait: wikiFile('Prince Leopold, Duke of Albany.jpg'),
    notes: 'Duke of Albany. Suffered from haemophilia. Patron of arts and literature.',
    parents: ['victoria', 'albert']
  },
  {
    id: 'beatrice',
    given_names: 'Beatrice Mary Victoria Feodore',
    surname: 'Saxe-Coburg and Gotha',
    gender: 'female',
    birth: { date: '1857-04-14', place: 'Buckingham Palace, London, England' },
    death: { date: '1944-10-26', place: 'Brantridge Park, Sussex, England' },
    portrait: wikiFile('Princess Beatrice 1886.jpg'),
    notes: 'Princess Henry of Battenberg. Served as Queen Victoria\'s personal secretary.',
    parents: ['victoria', 'albert']
  },

  // Spouses of Victoria's children
  {
    id: 'alexandra',
    given_names: 'Alexandra Caroline Marie Charlotte Louise Julia',
    surname: 'Schleswig-Holstein-Sonderburg-Glücksburg',
    gender: 'female',
    birth: { date: '1844-12-01', place: 'Yellow Palace, Copenhagen, Denmark' },
    death: { date: '1925-11-20', place: 'Sandringham House, Norfolk, England' },
    portrait: wikiFile('Alexandra of Denmark.jpg'),
    notes: 'Queen of the United Kingdom as wife of King Edward VII. Known for her beauty and charitable work.'
  },
  {
    id: 'frederick_iii',
    given_names: 'Frederick Wilhelm Nikolaus Karl',
    surname: 'Hohenzollern',
    gender: 'male',
    birth: { date: '1831-10-18', place: 'Neues Palais, Potsdam, Prussia' },
    death: { date: '1888-06-15', place: 'Neues Palais, Potsdam, Germany' },
    portrait: wikiFile('Friedrich III als Kronprinz (Höffert).jpg'),
    notes: 'German Emperor and King of Prussia (1888). Reign lasted only 99 days due to throat cancer.'
  },
  {
    id: 'louis_iv',
    given_names: 'Louis IV',
    surname: 'Hesse-Darmstadt',
    gender: 'male',
    birth: { date: '1837-09-12', place: 'Darmstadt, Grand Duchy of Hesse' },
    death: { date: '1892-03-13', place: 'Darmstadt, Grand Duchy of Hesse' },
    portrait: wikiFile('Ludwig IV Großherzog von Hessen.jpg'),
    notes: 'Grand Duke of Hesse and by Rhine.'
  },

  // Generation 3: Notable grandchildren
  {
    id: 'wilhelm_ii',
    given_names: 'Friedrich Wilhelm Viktor Albert',
    surname: 'Hohenzollern',
    gender: 'male',
    birth: { date: '1859-01-27', place: 'Crown Prince\'s Palace, Berlin, Prussia' },
    death: { date: '1941-06-04', place: 'Huis Doorn, Doorn, Netherlands' },
    portrait: wikiFile('Kaiser Wilhelm II of Germany - 1902.jpg'),
    notes: 'German Emperor and King of Prussia (1888-1918). Last German Kaiser. Led Germany during WWI.',
    parents: ['victoria_princess', 'frederick_iii']
  },
  {
    id: 'george_v',
    given_names: 'George Frederick Ernest Albert',
    surname: 'Windsor',
    surname_at_birth: 'Saxe-Coburg and Gotha',
    gender: 'male',
    birth: { date: '1865-06-03', place: 'Marlborough House, London, England' },
    death: { date: '1936-01-20', place: 'Sandringham House, Norfolk, England' },
    portrait: wikiFile('King George V 1911 color-crop.jpg'),
    notes: 'King of the United Kingdom and the British Dominions, Emperor of India (1910-1936). Changed family name to Windsor in 1917.',
    parents: ['edward_vii', 'alexandra']
  },
  {
    id: 'alix',
    given_names: 'Alix Victoria Helena Louise Beatrice',
    surname: 'Hesse-Darmstadt',
    gender: 'female',
    birth: { date: '1872-06-06', place: 'Darmstadt, Grand Duchy of Hesse' },
    death: { date: '1918-07-17', place: 'Yekaterinburg, Russia' },
    portrait: wikiFile('Alexandra Feodorovna LOC 01137u.jpg'),
    notes: 'Empress of Russia as wife of Nicholas II. Executed with her family during the Russian Revolution.',
    parents: ['alice', 'louis_iv']
  },
  {
    id: 'nicholas_ii',
    given_names: 'Nikolai Alexandrovich',
    surname: 'Romanov',
    gender: 'male',
    birth: { date: '1868-05-18', place: 'Alexander Palace, Tsarskoye Selo, Russia' },
    death: { date: '1918-07-17', place: 'Yekaterinburg, Russia' },
    portrait: wikiFile('Nicholas II of Russia cropped.jpg'),
    notes: 'Last Emperor of Russia (1894-1917). Executed with family by Bolsheviks.'
  },
  {
    id: 'mary_teck',
    given_names: 'Victoria Mary Augusta Louise Olga Pauline Claudine Agnes',
    surname: 'Teck',
    gender: 'female',
    birth: { date: '1867-05-26', place: 'Kensington Palace, London, England' },
    death: { date: '1953-03-24', place: 'Marlborough House, London, England' },
    portrait: wikiFile('Queen Mary of the United Kingdom, by William Llewellyn, 1911.jpg'),
    notes: 'Queen of the United Kingdom as wife of King George V. Great-grandmother of King Charles III.'
  }
];

// Marriages
const MARRIAGES = [
  { person1: 'victoria', person2: 'albert', date: '1840-02-10', place: 'Chapel Royal, St James\'s Palace, London' },
  { person1: 'victoria_princess', person2: 'frederick_iii', date: '1858-01-25', place: 'Chapel Royal, St James\'s Palace, London' },
  { person1: 'edward_vii', person2: 'alexandra', date: '1863-03-10', place: 'St George\'s Chapel, Windsor Castle' },
  { person1: 'alice', person2: 'louis_iv', date: '1862-07-01', place: 'Osborne House, Isle of Wight' },
  { person1: 'george_v', person2: 'mary_teck', date: '1893-07-06', place: 'Chapel Royal, St James\'s Palace, London' },
  { person1: 'nicholas_ii', person2: 'alix', date: '1894-11-26', place: 'Grand Church of the Winter Palace, St Petersburg' },
];

// Download image from URL using curl
function downloadImage(url, destPath) {
  try {
    // Use a browser User-Agent to avoid Wikipedia blocks
    execSync(`curl -L -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${destPath}" "${url}"`, { stdio: 'pipe' });
    // Verify it's actually an image (not an HTML error page)
    if (fs.existsSync(destPath)) {
      const size = fs.statSync(destPath).size;
      if (size > 5000) { // Real images are > 5KB
        return true;
      }
      // Check if it's HTML (error page)
      const content = fs.readFileSync(destPath, 'utf8').slice(0, 100);
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        fs.unlinkSync(destPath);
        return false;
      }
      return size > 0;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Escape SQL string
function sqlEscape(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Execute SQL via sqlite3 CLI
function execSql(dbPath, sql) {
  try {
    execSync(`sqlite3 "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
    return true;
  } catch (err) {
    console.error('SQL Error:', err.message);
    return false;
  }
}

function main() {
  console.log('Creating Queen Victoria Family Tree...\n');

  // Check if bundle already exists
  if (fs.existsSync(BUNDLE_PATH)) {
    console.log(`Removing existing bundle: ${BUNDLE_PATH}`);
    fs.rmSync(BUNDLE_PATH, { recursive: true });
  }

  // Create bundle structure
  console.log('Creating bundle structure...');
  fs.mkdirSync(BUNDLE_PATH, { recursive: true });
  fs.mkdirSync(path.join(BUNDLE_PATH, 'Media', 'photos'), { recursive: true });
  fs.mkdirSync(path.join(BUNDLE_PATH, 'Media', 'documents'), { recursive: true });
  fs.mkdirSync(path.join(BUNDLE_PATH, 'Media', 'thumbnails'), { recursive: true });

  // Write Info.plist
  fs.writeFileSync(path.join(BUNDLE_PATH, 'Info.plist'), INFO_PLIST);
  fs.writeFileSync(path.join(BUNDLE_PATH, '.heritage-version'), '2');
  fs.writeFileSync(path.join(BUNDLE_PATH, 'PkgInfo'), 'BNDL????');

  // Initialize database
  console.log('Initializing database...');
  const dbPath = path.join(BUNDLE_PATH, 'database.sqlite');

  // Read and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  // Write schema to temp file and import
  const tempSchemaPath = path.join(BUNDLE_PATH, 'temp_schema.sql');
  fs.writeFileSync(tempSchemaPath, schema);
  execSync(`sqlite3 "${dbPath}" < "${tempSchemaPath}"`, { stdio: 'pipe' });
  fs.unlinkSync(tempSchemaPath);

  // Build SQL statements
  const sqlStatements = [];

  // Create persons and download portraits
  const personIds = {};
  const photoIds = {};
  console.log('\nCreating persons and downloading portraits...');

  for (const person of FAMILY_DATA) {
    const id = uuidv4();
    personIds[person.id] = id;

    // Download portrait if available
    let photoId = null;
    if (person.portrait) {
      photoId = uuidv4();
      photoIds[person.id] = photoId;
      const ext = '.jpg';
      const filename = `${photoId}${ext}`;
      const photoPath = path.join(BUNDLE_PATH, 'Media', 'photos', filename);

      process.stdout.write(`  Downloading portrait for ${person.given_names}... `);
      if (downloadImage(person.portrait, photoPath)) {
        console.log('✓');

        // Insert media record
        sqlStatements.push(`INSERT INTO media (id, path, filename, type, mime_type, title) VALUES (${sqlEscape(photoId)}, ${sqlEscape('photos/' + filename)}, ${sqlEscape(filename)}, 'photo', 'image/jpeg', ${sqlEscape('Portrait of ' + person.given_names + ' ' + person.surname)});`);

        // Create face_tag to link media to person (required for PersonPhoto component)
        // Use coordinates that work well for portrait photos: centered upper area
        sqlStatements.push(`INSERT INTO face_tag (id, media_id, person_id, x, y, width, height) VALUES (${sqlEscape(uuidv4())}, ${sqlEscape(photoId)}, ${sqlEscape(id)}, 20, 5, 60, 70);`);
      } else {
        console.log('✗ (download failed)');
        photoId = null;
      }
    } else {
      console.log(`  ✓ ${person.given_names} ${person.surname}`);
    }

    // Insert person
    sqlStatements.push(`INSERT INTO person (id, given_names, surname, surname_at_birth, gender, notes, primary_photo_id) VALUES (${sqlEscape(id)}, ${sqlEscape(person.given_names)}, ${sqlEscape(person.surname)}, ${sqlEscape(person.surname_at_birth || null)}, ${sqlEscape(person.gender)}, ${sqlEscape(person.notes)}, ${sqlEscape(photoId)});`);

    // Create birth event
    if (person.birth) {
      sqlStatements.push(`INSERT INTO event (id, person_id, union_id, type, date, place_id, notes) VALUES (${sqlEscape(uuidv4())}, ${sqlEscape(id)}, NULL, 'birth', ${sqlEscape(person.birth.date)}, NULL, NULL);`);
    }

    // Create death event
    if (person.death) {
      sqlStatements.push(`INSERT INTO event (id, person_id, union_id, type, date, place_id, notes) VALUES (${sqlEscape(uuidv4())}, ${sqlEscape(id)}, NULL, 'death', ${sqlEscape(person.death.date)}, NULL, NULL);`);
    }
  }

  // Create marriages
  console.log('\nCreating marriages...');
  const unionIds = {};
  for (const marriage of MARRIAGES) {
    const unionId = uuidv4();
    const key = `${marriage.person1}-${marriage.person2}`;
    unionIds[key] = unionId;

    sqlStatements.push(`INSERT INTO union_ (id, person1_id, person2_id, type) VALUES (${sqlEscape(unionId)}, ${sqlEscape(personIds[marriage.person1])}, ${sqlEscape(personIds[marriage.person2])}, 'marriage');`);

    // Add marriage event
    sqlStatements.push(`INSERT INTO event (id, person_id, union_id, type, date, place_id, notes) VALUES (${sqlEscape(uuidv4())}, NULL, ${sqlEscape(unionId)}, 'marriage', ${sqlEscape(marriage.date)}, NULL, NULL);`);

    console.log(`  ✓ ${marriage.person1} & ${marriage.person2} (${marriage.date})`);
  }

  // Add children to unions
  console.log('\nLinking children to parents...');
  for (const person of FAMILY_DATA) {
    if (person.parents) {
      const [parent1, parent2] = person.parents;
      const unionKey = `${parent1}-${parent2}`;
      const unionId = unionIds[unionKey];

      if (unionId) {
        sqlStatements.push(`INSERT INTO union_child (id, union_id, person_id, birth_order) VALUES (${sqlEscape(uuidv4())}, ${sqlEscape(unionId)}, ${sqlEscape(personIds[person.id])}, NULL);`);
        console.log(`  ✓ ${person.given_names} → ${parent1} & ${parent2}`);
      }
    }
  }

  // Execute all SQL statements
  console.log('\nWriting to database...');
  const allSql = sqlStatements.join('\n');
  const tempSqlPath = path.join(BUNDLE_PATH, 'temp_data.sql');
  fs.writeFileSync(tempSqlPath, allSql);
  execSync(`sqlite3 "${dbPath}" < "${tempSqlPath}"`, { stdio: 'pipe' });
  fs.unlinkSync(tempSqlPath);

  console.log(`\n✓ Bundle created at: ${BUNDLE_PATH}`);
  console.log('\nOpen Heritage and select File > Open to load the bundle.');
}

main();
