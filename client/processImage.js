const progressPercentage = document.getElementById("progressPercentage");
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageButton = document.getElementById('remove-image');

let recognizedImageText = ''; // Store the recognized text from the image
let recognizedLabels = ''; // Store the recognized labels from the image
let webDetectionResults = '';
let ImageBase64;

imageInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target.result;
      ImageBase64 = dataURL.split(',')[1];
      console.log(ImageBase64);
      processImage(ImageBase64);
      progressPercentage.textContent = 'Please wait for image to upload...';
      imagePreview.src = dataURL;
      showImagePreview();
    };
    reader.readAsDataURL(e.target.files[0]);
});

async function processImage(imageBase64) {
    try {
      const response = await fetch('https://securitygpt.onrender.com/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          webDetection: true, // Add this line to request web detection
        }),
      });
  
      if (response.ok) {
        const data = await response.json();

        recognizedImageText = data.recognizedImageText;
        recognizedLabels = data.recognizedLabels;
        webDetectionResults = data.webDetectionResults; // Store the web detection results

        console.log('Recognized text:', recognizedImageText);
        console.log('Recognized labels:', recognizedLabels);
        console.log('Web detection results:', webDetectionResults);

        // Update progress percentage to 100% after the data is received
        progressPercentage.textContent = '100%';

      } else {
        throw new Error('Failed to process image');
      }
    } catch (error) {
      console.error('Error during image processing:', error.message);
      alert('Something went wrong while processing the image');
    }
}

// Show the image preview and remove button
function showImagePreview() {
    imagePreviewContainer.classList.remove('hidden');
    imagePreview.classList.remove('hidden');
    removeImageButton.classList.remove('hidden');
}
  
  // Hide the image preview and remove button
function hideImagePreview() {
    imagePreviewContainer.classList.add('hidden');
    imagePreview.classList.add('hidden');
    removeImageButton.classList.add('hidden');
}
  
// Add an event listener for the remove button
removeImageButton.addEventListener('click', () => {
    // Clear the file input, image preview, and hide the preview container
    clearImageUpload();
});
  
export function clearImageUpload() {
    // Clear the file input, image preview, and hide the preview container
    imageInput.value = '';
    imagePreview.src = '';
    hideImagePreview();
    ImageBase64 = '';
    recognizedImageText = '';
    recognizedLabels = '';
    webDetectionResults = '';
    progressPercentage.textContent = '';
}

export function getImageFromMod() {
    return ImageBase64;
}