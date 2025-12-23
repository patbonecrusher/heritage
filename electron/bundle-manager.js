/**
 * BundleManager - Handles .heritage bundle operations
 *
 * A .heritage file is a macOS bundle containing:
 * - database.sqlite: The SQLite database
 * - Media/: All associated media files
 * - Info.plist: Bundle metadata
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BUNDLE_EXTENSION = '.heritage';
const CURRENT_FORMAT_VERSION = 1;

const INFO_PLIST_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.heritage.familytree</string>
    <key>CFBundleName</key>
    <string>{{name}}</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>HeritageFormatVersion</key>
    <string>${CURRENT_FORMAT_VERSION}</string>
    <key>HeritageCreatedAt</key>
    <string>{{createdAt}}</string>
    <key>HeritageLastModified</key>
    <string>{{lastModified}}</string>
</dict>
</plist>`;

class BundleManager {
  constructor(bundlePath = null) {
    this.bundlePath = bundlePath;
    this.db = null;
  }

  /**
   * Create a new .heritage bundle
   */
  async create(bundlePath, name = 'Family Tree') {
    if (!bundlePath.endsWith(BUNDLE_EXTENSION)) {
      bundlePath += BUNDLE_EXTENSION;
    }

    // Check if already exists
    if (fs.existsSync(bundlePath)) {
      throw new Error(`Bundle already exists: ${bundlePath}`);
    }

    // Create bundle directory structure
    fs.mkdirSync(bundlePath, { recursive: true });
    fs.mkdirSync(path.join(bundlePath, 'Media', 'photos'), { recursive: true });
    fs.mkdirSync(path.join(bundlePath, 'Media', 'documents'), { recursive: true });
    fs.mkdirSync(path.join(bundlePath, 'Media', 'headstones'), { recursive: true });
    fs.mkdirSync(path.join(bundlePath, 'Media', 'thumbnails'), { recursive: true });

    // Create Info.plist
    const now = new Date().toISOString();
    const infoPlist = INFO_PLIST_TEMPLATE
      .replace('{{name}}', name)
      .replace('{{createdAt}}', now)
      .replace('{{lastModified}}', now);
    fs.writeFileSync(path.join(bundlePath, 'Info.plist'), infoPlist);

    // Create version file
    fs.writeFileSync(path.join(bundlePath, '.heritage-version'), String(CURRENT_FORMAT_VERSION));

    // Create database
    await this.initializeDatabase(bundlePath);

    // Set bundle bit on macOS
    this.setBundleBit(bundlePath);

    this.bundlePath = bundlePath;
    return bundlePath;
  }

  /**
   * Open an existing .heritage bundle
   */
  async open(bundlePath) {
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle not found: ${bundlePath}`);
    }

    const dbPath = path.join(bundlePath, 'database.sqlite');
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Invalid bundle: database.sqlite not found`);
    }

    // Check version and migrate if needed
    await this.checkAndMigrate(bundlePath);

    this.bundlePath = bundlePath;
    return this.getDatabase();
  }

  /**
   * Initialize a new database with schema
   */
  async initializeDatabase(bundlePath) {
    const Database = require('better-sqlite3');
    const dbPath = path.join(bundlePath, 'database.sqlite');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

    const db = new Database(dbPath);

    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    db.close();
  }

  /**
   * Get database connection
   */
  getDatabase() {
    if (!this.bundlePath) {
      throw new Error('No bundle open');
    }

    const Database = require('better-sqlite3');
    const dbPath = path.join(this.bundlePath, 'database.sqlite');
    return new Database(dbPath);
  }

  /**
   * Import a media file into the bundle
   */
  async importMedia(sourcePath, type = 'photos') {
    if (!this.bundlePath) {
      throw new Error('No bundle open');
    }

    const validTypes = ['photos', 'documents', 'headstones'];
    if (!validTypes.includes(type)) {
      type = 'documents';
    }

    // Generate UUID filename, preserve extension
    const ext = path.extname(sourcePath).toLowerCase();
    const uuid = uuidv4();
    const newFilename = `${uuid}${ext}`;
    const relativePath = `Media/${type}/${newFilename}`;
    const destPath = path.join(this.bundlePath, relativePath);

    // Copy file
    fs.copyFileSync(sourcePath, destPath);

    // Generate thumbnail for images
    let thumbnailPath = null;
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      thumbnailPath = await this.generateThumbnail(destPath, uuid);
    }

    return {
      id: uuid,
      path: relativePath,
      thumbnailPath: thumbnailPath,
      filename: path.basename(sourcePath),
      mimeType: this.getMimeType(ext),
    };
  }

  /**
   * Generate a thumbnail for an image
   */
  async generateThumbnail(imagePath, uuid) {
    // Using sharp if available, otherwise skip
    try {
      const sharp = require('sharp');
      const thumbnailFilename = `${uuid}_thumb.jpg`;
      const thumbnailRelativePath = `Media/thumbnails/${thumbnailFilename}`;
      const thumbnailPath = path.join(this.bundlePath, thumbnailRelativePath);

      await sharp(imagePath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailRelativePath;
    } catch (e) {
      // sharp not available, skip thumbnail
      console.warn('Thumbnail generation skipped (sharp not available)');
      return null;
    }
  }

  /**
   * Get the full path to a media file
   */
  resolveMediaPath(relativePath) {
    if (!this.bundlePath) {
      throw new Error('No bundle open');
    }
    return path.join(this.bundlePath, relativePath);
  }

  /**
   * Delete a media file from the bundle
   */
  deleteMedia(relativePath) {
    const fullPath = this.resolveMediaPath(relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Also delete thumbnail if exists
    const thumbnailPath = this.getThumbnailPath(relativePath);
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
  }

  /**
   * Get thumbnail path for a media file
   */
  getThumbnailPath(relativePath) {
    const ext = path.extname(relativePath);
    const basename = path.basename(relativePath, ext);
    return path.join(this.bundlePath, 'Media', 'thumbnails', `${basename}_thumb.jpg`);
  }

  /**
   * Check version and run migrations if needed
   */
  async checkAndMigrate(bundlePath) {
    const versionFile = path.join(bundlePath, '.heritage-version');
    let version = 0;

    if (fs.existsSync(versionFile)) {
      version = parseInt(fs.readFileSync(versionFile, 'utf8').trim(), 10);
    }

    if (version < CURRENT_FORMAT_VERSION) {
      await this.migrate(bundlePath, version, CURRENT_FORMAT_VERSION);
      fs.writeFileSync(versionFile, String(CURRENT_FORMAT_VERSION));
    }
  }

  /**
   * Run migrations between versions
   */
  async migrate(bundlePath, fromVersion, toVersion) {
    console.log(`Migrating bundle from version ${fromVersion} to ${toVersion}`);

    // Migration logic will go here as schema evolves
    // Example:
    // if (fromVersion < 2) { await this.migrateToV2(bundlePath); }
    // if (fromVersion < 3) { await this.migrateToV3(bundlePath); }
  }

  /**
   * Set the bundle bit on macOS so Finder treats it as a package
   */
  setBundleBit(bundlePath) {
    if (process.platform === 'darwin') {
      try {
        const { execSync } = require('child_process');
        // Set the bundle bit using SetFile (requires Xcode Command Line Tools)
        // Alternatively, the presence of Info.plist often suffices
        execSync(`/usr/bin/SetFile -a B "${bundlePath}"`, { stdio: 'ignore' });
      } catch (e) {
        // SetFile not available, rely on Info.plist
        console.warn('Could not set bundle bit (SetFile not available)');
      }
    }
  }

  /**
   * Update the last modified timestamp in Info.plist
   */
  updateLastModified() {
    if (!this.bundlePath) return;

    const plistPath = path.join(this.bundlePath, 'Info.plist');
    if (fs.existsSync(plistPath)) {
      let content = fs.readFileSync(plistPath, 'utf8');
      const now = new Date().toISOString();
      content = content.replace(
        /<key>HeritageLastModified<\/key>\s*<string>[^<]*<\/string>/,
        `<key>HeritageLastModified</key>\n    <string>${now}</string>`
      );
      fs.writeFileSync(plistPath, content);
    }
  }

  /**
   * Get MIME type from extension
   */
  getMimeType(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get bundle info
   */
  getInfo() {
    if (!this.bundlePath) return null;

    const plistPath = path.join(this.bundlePath, 'Info.plist');
    const versionPath = path.join(this.bundlePath, '.heritage-version');

    return {
      path: this.bundlePath,
      name: path.basename(this.bundlePath, BUNDLE_EXTENSION),
      formatVersion: fs.existsSync(versionPath)
        ? parseInt(fs.readFileSync(versionPath, 'utf8').trim(), 10)
        : 0,
      hasPlist: fs.existsSync(plistPath),
    };
  }

  /**
   * Close the bundle
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.bundlePath = null;
  }
}

module.exports = { BundleManager, BUNDLE_EXTENSION, CURRENT_FORMAT_VERSION };
