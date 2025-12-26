/**
 * FaceDetector - Wrapper for face-api.js face detection
 */

import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

/**
 * Load face detection models (only loads once)
 */
export async function loadModels() {
  if (modelsLoaded) return true;

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const modelPath = '/models';

      // Use SSD MobileNet for better accuracy (larger but more reliable)
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      ]);

      modelsLoaded = true;
      console.log('Face detection models loaded (SSD MobileNet)');
      return true;
    } catch (error) {
      console.error('Failed to load face detection models:', error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Detect faces in an image
 * @param {HTMLImageElement|HTMLCanvasElement} input - Image or canvas element
 * @returns {Promise<Array<{x: number, y: number, width: number, height: number, xPct: number, yPct: number, widthPct: number, heightPct: number}>>}
 */
export async function detectFaces(input) {
  await loadModels();

  // Get image dimensions
  const width = input.width || input.naturalWidth;
  const height = input.height || input.naturalHeight;

  console.log('Detecting faces in image:', width, 'x', height);

  // Create a canvas and draw the image to it
  // This avoids CORS issues with custom protocols
  let canvas;
  if (input instanceof HTMLCanvasElement) {
    canvas = input;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(input, 0, 0, width, height);
  }

  // SSD MobileNet options - more accurate than TinyFaceDetector
  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.3,  // Lower threshold to catch more faces
  });

  console.log('Running face detection...');
  const detections = await faceapi.detectAllFaces(canvas, options);
  console.log('Found', detections.length, 'faces');

  // Convert detections to our format with percentages
  // Auto-expand boxes for better profile pictures
  return detections.map(detection => {
    const box = detection.box;

    // Expand the box for a nicer head-and-shoulders crop
    const expandTop = box.height * 0.5;      // 50% above for hair
    const expandBottom = box.height * 0.7;   // 70% below for neck/shoulders
    const expandSide = box.width * 0.3;      // 30% on each side

    // Calculate expanded box, clamped to image bounds
    const expandedX = Math.max(0, box.x - expandSide);
    const expandedY = Math.max(0, box.y - expandTop);
    const expandedRight = Math.min(width, box.x + box.width + expandSide);
    const expandedBottom = Math.min(height, box.y + box.height + expandBottom);
    const expandedWidth = expandedRight - expandedX;
    const expandedHeight = expandedBottom - expandedY;

    return {
      // Absolute pixel values (expanded)
      x: Math.round(expandedX),
      y: Math.round(expandedY),
      width: Math.round(expandedWidth),
      height: Math.round(expandedHeight),
      // Percentage values (for database storage)
      xPct: (expandedX / width) * 100,
      yPct: (expandedY / height) * 100,
      widthPct: (expandedWidth / width) * 100,
      heightPct: (expandedHeight / height) * 100,
      // Detection confidence
      score: detection.score,
    };
  });
}

/**
 * Detect faces from an image URL
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<Array>} Array of face detections
 */
export async function detectFacesFromUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const faces = await detectFaces(img);
        resolve(faces);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Check if models are loaded
 */
export function isReady() {
  return modelsLoaded;
}

export default {
  loadModels,
  detectFaces,
  detectFacesFromUrl,
  isReady,
};
