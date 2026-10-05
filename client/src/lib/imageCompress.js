export async function compressImage(file, maxDim = 128, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File harus berupa gambar'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Crop square center
        const minSide = Math.min(width, height);
        const sx = (width - minSide) / 2;
        const sy = (height - minSide) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context gagal'));
        }

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}
