class PhotoCompressor {
  constructor() {
    this.originalFile = null;
    this.compressedBlob = null;
    this.selectedSize = null;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    const fileInput = document.getElementById("fileInput");
    const uploadArea = document.getElementById("uploadArea");
    const optionCards = document.querySelectorAll(".option-card");
    const downloadBtn = document.getElementById("downloadBtn");

    // File input change
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");

      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Compression option selection
    optionCards.forEach((card) => {
      card.addEventListener("click", () => {
        const targetSize = Number.parseInt(card.dataset.size);
        this.selectCompressionOption(card, targetSize);
      });
    });

    // Download button
    downloadBtn.addEventListener("click", () => {
      this.downloadCompressedImage();
    });
  }

  handleFileSelect(file) {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Mohon pilih file gambar yang valid (JPG, PNG, WebP)");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimal 50MB");
      return;
    }

    this.originalFile = file;
    this.showCompressionOptions();
    this.displayOriginalImage();
  }

  showCompressionOptions() {
    document.getElementById("compressionSection").style.display = "block";
    document.getElementById("previewSection").style.display = "none";
  }

  displayOriginalImage() {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalImage = document.getElementById("originalImage");
      originalImage.src = e.target.result;

      const originalSize = document.getElementById("originalSize");
      originalSize.textContent = this.formatFileSize(this.originalFile.size);
    };
    reader.readAsDataURL(this.originalFile);
  }

  selectCompressionOption(selectedCard, targetSize) {
    // Remove previous selection
    document.querySelectorAll(".option-card").forEach((card) => {
      card.classList.remove("selected");
    });

    // Add selection to clicked card
    selectedCard.classList.add("selected");
    this.selectedSize = targetSize;

    // Start compression after a short delay for better UX
    setTimeout(() => {
      this.compressImage(targetSize);
    }, 500);
  }

  async compressImage(targetSizeKB) {
    this.showLoading();

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions
        const { width, height } = this.calculateOptimalDimensions(
          img.width,
          img.height,
          targetSizeKB
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to hit target size
        this.findOptimalQuality(canvas, targetSizeKB);
      };

      img.src = URL.createObjectURL(this.originalFile);
    } catch (error) {
      console.error("Compression error:", error);
      alert("Terjadi kesalahan saat mengkompresi gambar");
      this.hideLoading();
    }
  }

  calculateOptimalDimensions(originalWidth, originalHeight, targetSizeKB) {
    const originalSize = this.originalFile.size;
    const targetSize = targetSizeKB * 1024;

    // Estimate compression ratio needed
    const compressionRatio = Math.sqrt(targetSize / originalSize);

    // Calculate new dimensions
    let newWidth = Math.floor(originalWidth * compressionRatio);
    let newHeight = Math.floor(originalHeight * compressionRatio);

    // Ensure minimum dimensions
    const minDimension = 200;
    if (newWidth < minDimension || newHeight < minDimension) {
      const scale = minDimension / Math.min(newWidth, newHeight);
      newWidth = Math.floor(newWidth * scale);
      newHeight = Math.floor(newHeight * scale);
    }

    // Ensure maximum dimensions for very large images
    const maxDimension = 2000;
    if (newWidth > maxDimension || newHeight > maxDimension) {
      const scale = maxDimension / Math.max(newWidth, newHeight);
      newWidth = Math.floor(newWidth * scale);
      newHeight = Math.floor(newHeight * scale);
    }

    return { width: newWidth, height: newHeight };
  }

  findOptimalQuality(canvas, targetSizeKB) {
    const targetSize = targetSizeKB * 1024;
    let quality = 0.9;
    let attempts = 0;
    const maxAttempts = 10;

    const tryCompress = () => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Gagal mengkompresi gambar");
            this.hideLoading();
            return;
          }

          attempts++;

          // If size is acceptable or we've tried enough times
          if (blob.size <= targetSize * 1.2 || attempts >= maxAttempts) {
            this.compressedBlob = blob;
            this.showCompressedResult();
            return;
          }

          // If still too large, reduce quality and try again
          if (blob.size > targetSize && quality > 0.1) {
            quality -= 0.1;
            setTimeout(tryCompress, 100);
          } else {
            // Accept current result if we can't compress further
            this.compressedBlob = blob;
            this.showCompressedResult();
          }
        },
        "image/jpeg",
        quality
      );
    };

    tryCompress();
  }

  showCompressedResult() {
    this.hideLoading();

    // Show preview section
    document.getElementById("previewSection").style.display = "block";

    // Display compressed image
    const compressedImage = document.getElementById("compressedImage");
    const compressedSize = document.getElementById("compressedSize");

    const url = URL.createObjectURL(this.compressedBlob);
    compressedImage.src = url;
    compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);

    // Scroll to preview
    document.getElementById("previewSection").scrollIntoView({
      behavior: "smooth",
    });
  }

  downloadCompressedImage() {
    if (!this.compressedBlob) return;

    const url = URL.createObjectURL(this.compressedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compressed_${this.selectedSize}kb_${this.originalFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showLoading() {
    document.getElementById("loading").style.display = "block";
    document.getElementById("compressionSection").style.display = "none";
    document.getElementById("previewSection").style.display = "none";
  }

  hideLoading() {
    document.getElementById("loading").style.display = "none";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  }
}

// Reset function
function resetCompressor() {
  // Reset file input
  document.getElementById("fileInput").value = "";

  // Hide sections
  document.getElementById("compressionSection").style.display = "none";
  document.getElementById("previewSection").style.display = "none";
  document.getElementById("loading").style.display = "none";

  // Remove selections
  document.querySelectorAll(".option-card").forEach((card) => {
    card.classList.remove("selected");
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PhotoCompressor();
});
