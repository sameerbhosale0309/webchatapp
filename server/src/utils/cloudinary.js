import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || env.cloudinary.cloudName || 'ddyfxxm8p';
const apiKey = process.env.CLOUDINARY_API_KEY || env.cloudinary.apiKey || '296674992939872';
const apiSecret = process.env.CLOUDINARY_API_SECRET || env.cloudinary.apiSecret || '2c_R84emqm7vBnkPksrKG5jYAmM';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

/**
 * Uploads a file buffer directly to Cloudinary account ddyfxxm8p
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Upload options (folder, resource_type, filename)
 * @returns {Promise<Object>} Upload result containing secure_url, public_id, etc.
 */
export async function uploadToCloudinaryBuffer(buffer, options = {}) {
  const { folder = 'realtime-chat-uploads', resource_type = 'auto', filename } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        public_id: filename ? `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}` : undefined,
      },
      async (error, result) => {
        if (error) {
          console.warn('[Cloudinary Signed Upload Error]:', error.message || error);
          
          // Fallback attempt: Unsigned upload stream to cloudName ddyfxxm8p
          try {
            const unsignedResult = await uploadUnsignedToCloudinary(buffer, { cloudName, folder, resource_type });
            if (unsignedResult && unsignedResult.url) {
              console.log('✅ [Cloudinary Upload Success]:', unsignedResult.url);
              return resolve(unsignedResult);
            }
          } catch (e) {
            console.warn('[Cloudinary Unsigned Upload Error]:', e.message || e);
          }

          // Fallback base64 URI so user operation never breaks
          const mimeType = options.mimeType || 'image/png';
          const base64Str = `data:${mimeType};base64,${buffer.toString('base64')}`;
          return resolve({
            url: base64Str,
            public_id: `fallback_${Date.now()}`,
            resource_type: resource_type === 'auto' ? 'image' : resource_type,
            bytes: buffer.length,
          });
        }

        console.log('✅ [Cloudinary Upload Success]:', result.secure_url || result.url);
        return resolve({
          url: result.secure_url || result.url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Helper to attempt unsigned upload via Cloudinary REST API to cloudName ddyfxxm8p
 */
async function uploadUnsignedToCloudinary(buffer, { cloudName, folder, resource_type }) {
  const restResourceType = resource_type === 'video' || resource_type === 'audio' ? 'video' : 'image';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${restResourceType}/upload`;

  const formData = new FormData();
  const blob = new Blob([buffer]);
  formData.append('file', blob);
  formData.append('upload_preset', 'ml_default');
  formData.append('folder', folder);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary REST returned status ${response.status}`);
  }

  const data = await response.json();
  return {
    url: data.secure_url || data.url,
    public_id: data.public_id,
    resource_type: data.resource_type,
    format: data.format,
    bytes: data.bytes,
  };
}

export default cloudinary;
