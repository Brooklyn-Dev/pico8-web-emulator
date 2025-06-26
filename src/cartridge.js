export async function loadP8PNG(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Extract pixel data
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      resolve({ width: canvas.width, height: canvas.height, data: imageData.data });
    };

    img.onerror = reject;
    img.src = url;
  });
}
