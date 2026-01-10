/**
 * Cloudinary Configuration
 * Cloud-based image storage for machine images
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} file - File buffer or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadImage = async (file, options = {}) => {
    const defaultOptions = {
        folder: 'gmao/machines',
        resource_type: 'image',
        transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
        ],
    };

    const uploadOptions = { ...defaultOptions, ...options };

    // If file is a buffer, convert to base64 data URI
    let uploadData = file;
    if (Buffer.isBuffer(file)) {
        uploadData = `data:image/jpeg;base64,${file.toString('base64')}`;
    }

    return cloudinary.uploader.upload(uploadData, uploadOptions);
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (publicId) => {
    return cloudinary.uploader.destroy(publicId);
};

/**
 * Generate thumbnail URL
 * @param {string} url - Original image URL
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
const getThumbnailUrl = (url, width = 200, height = 200) => {
    if (!url || !url.includes('cloudinary')) {
        return url;
    }

    return url.replace('/upload/', `/upload/c_fill,w_${width},h_${height}/`);
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID
 */
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary')) {
        return null;
    }

    // Extract public ID from URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123/folder/filename.ext
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return matches ? matches[1] : null;
};

module.exports = {
    cloudinary,
    uploadImage,
    deleteImage,
    getThumbnailUrl,
    getPublicIdFromUrl,
};
