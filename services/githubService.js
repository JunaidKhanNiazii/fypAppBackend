const axios = require("axios");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "JunaidKhanNiazii/faces";

/**
 * Upload an image to GitHub repository
 * @param {string} fileName - Path and filename in the repo
 * @param {string} content - Base64 encoded image content
 * @param {string} [sha] - SHA of existing file for overwrite
 */
async function uploadImage(fileName, content, sha = null) {
    const uploadUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}`;
    const payload = {
        message: `Upload ${fileName}`,
        content: content,
    };
    if (sha) payload.sha = sha;

    const response = await axios.put(uploadUrl, payload, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
        },
    });
    return `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${fileName}`;
}

/**
 * Delete a file from GitHub repository
 * @param {string} filePath - Path to the file
 * @param {string} sha - SHA of the file to delete
 */
async function deleteFile(filePath, sha) {
    const deleteUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
    await axios.delete(deleteUrl, {
        data: {
            message: `Delete ${filePath}`,
            sha: sha
        },
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });
}

/**
 * Cleanup an entire folder in GitHub repository
 * @param {string} folderPath - Path to the folder
 */
async function cleanupFolder(folderPath) {
    try {
        const contents = await axios.get(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${folderPath}`,
            { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
        );

        if (Array.isArray(contents.data)) {
            for (const file of contents.data) {
                await deleteFile(file.path, file.sha);
            }
        }
    } catch (err) {
        if (err.response?.status !== 404) {
            console.warn(`⚠️ GitHub cleanup warning for ${folderPath}:`, err.message);
        }
    }
}

/**
 * Get file SHA if it exists
 * @param {string} filePath 
 */
async function getFileSha(filePath) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
        });
        return response.data.sha;
    } catch (e) {
        return null;
    }
}

module.exports = {
    uploadImage,
    deleteFile,
    cleanupFolder,
    getFileSha
};
