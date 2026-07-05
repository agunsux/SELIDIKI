const crypto = require('crypto');
const path = require('path');

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'SUPABASE';
const MAX_UPLOAD_SIZE = parseInt(process.env.STORAGE_MAX_SIZE || '5242880'); // 5MB default
const ALLOWED_MIMES = (process.env.STORAGE_ALLOWED_MIME || 'image/jpeg,image/png,image/webp,application/pdf').split(',');

class StorageService {
  /**
   * Validate file size, mime type, and verify magic bytes to ensure it's not an executable.
   * @param {Object} file - Multer file object
   */
  static validate(file) {
    if (!file || !file.buffer) {
      throw new Error('File tidak ditemukan');
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error(`Ukuran file melebihi batas maksimum (max ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB)`);
    }

    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error('Format file tidak didukung');
    }

    // Virus-safe signature check (Magic Bytes validation)
    const buffer = file.buffer;
    if (buffer.length >= 4) {
      const headerHex = buffer.toString('hex', 0, 4).toUpperCase();
      
      // Prevent common executables
      // MZ signature (EXE/DLL)
      if (headerHex.startsWith('4D5A')) {
        throw new Error('File terdeteksi sebagai executable berbahaya');
      }
      // ELF signature
      if (headerHex.startsWith('7F454C46')) {
        throw new Error('File terdeteksi sebagai executable berbahaya');
      }
      // Script indicators like <?php, <% or #!
      const textHeader = buffer.toString('ascii', 0, 5).toUpperCase();
      if (textHeader.startsWith('<?PHP') || textHeader.startsWith('<%') || textHeader.startsWith('#!')) {
        throw new Error('File script berbahaya tidak diperbolehkan');
      }
    }
    
    return true;
  }

  /**
   * Upload file and return public URL
   * @param {Object} file - Multer file object
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  static async upload(file) {
    this.validate(file);

    const ext = path.extname(file.originalname) || '.png';
    const uniqueName = `${crypto.randomUUID()}${ext}`;

    if (STORAGE_PROVIDER === 'SUPABASE') {
      return this.uploadToSupabase(file.buffer, uniqueName, file.mimetype);
    } else if (STORAGE_PROVIDER === 'R2') {
      return this.uploadToR2(file.buffer, uniqueName, file.mimetype);
    } else {
      // Mock / fallback local file simulation if no provider is configured
      return `/uploads/evidence/${uniqueName}`;
    }
  }

  /**
   * Upload to Supabase Storage bucket via REST API.
   */
  static async uploadToSupabase(buffer, filename, mimeType) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'evidence';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY not configured. Falling back to local URL.');
      return `/uploads/evidence/${filename}`;
    }

    // Call REST endpoint
    // POST /storage/v1/object/:bucket/:path
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true'
        },
        body: buffer
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase Storage error: ${response.status} ${errorText}`);
      }

      // Return public URL path
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
    } catch (err) {
      console.error('Supabase upload failed:', err.message);
      throw new Error(`Gagal mengunggah file ke Supabase: ${err.message}`);
    }
  }

  /**
   * Upload to Cloudflare R2 using AWS S3 SDK.
   */
  static async uploadToR2(buffer, filename, mimeType) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL || '';

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      console.warn('⚠️ Cloudflare R2 configurations are missing. Falling back to local URL.');
      return `/uploads/evidence/${filename}`;
    }

    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      
      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      // Construct public URL
      if (publicUrl) {
        return `${publicUrl.replace(/\/$/, '')}/${filename}`;
      }
      return `${endpoint}/${bucket}/${filename}`;
    } catch (err) {
      console.error('Cloudflare R2 upload failed:', err.message);
      throw new Error(`Gagal mengunggah file ke R2: ${err.message}`);
    }
  }
}

module.exports = StorageService;
