const { jsPDF } = window.jspdf;
let imageList = [];
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const video = document.getElementById('video-feed');
const snapBtn = document.getElementById('snap-btn');
const qSlider = document.getElementById('q-slider');
const qLabel = document.getElementById('q-label');
const filterSelect = document.getElementById('filter-select');

qSlider.oninput = function() { qLabel.innerText = Math.round(this.value * 100) + "%"; };

document.getElementById('file-input').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => addImageToList(event.target.result);
        reader.readAsDataURL(file);
    });
});

function addImageToList(src) {
    const index = imageList.length;
    imageList.push(src);
    const wrapper = document.createElement('div');
    wrapper.className = 'img-wrapper';
    wrapper.id = `img-wrap-${index}`;
    wrapper.innerHTML = `<img src="${src}"><button class="del-btn" onclick="removeImage(${index})">×</button>`;
    previewContainer.appendChild(wrapper);
    convertBtn.disabled = false;
}

function removeImage(index) {
    imageList[index] = null;
    document.getElementById(`img-wrap-${index}`).remove();
    convertBtn.disabled = !imageList.some(img => img !== null);
}

async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.style.display = "block";
        snapBtn.style.display = "block";
    } catch (err) { alert("Kamera error."); }
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    addImageToList(canvas.toDataURL('image/jpeg', 0.8));
}

// Logika Pemrosesan Gambar Berdasarkan Filter
async function processImage(imageSrc, filter, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let src = cv.imread(img);
            let dst = new cv.Mat();
            
            // Resize otomatis ke 1200px agar file ringan
            let width = src.cols;
            let height = src.rows;
            const MAX_WIDTH = 1200; 
            if (width > MAX_WIDTH) {
                height = Math.round(height * (MAX_WIDTH / width));
                width = MAX_WIDTH;
                cv.resize(src, src, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
            }

            // Aplikasi Filter
            if (filter === 'enhanced') {
                // Tingkatkan Kontras & Kecerahan
                src.convertTo(dst, -1, 1.2, 10);
            } else if (filter === 'bw') {
                // Hitam Putih Bersih
                cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
                cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 25);
            } else {
                // Normal
                dst = src.clone();
            }

            cv.imshow('canvasOutput', dst);
            const dataUrl = document.getElementById('canvasOutput').toDataURL('image/jpeg', parseFloat(quality));
            
            src.delete(); dst.delete();
            resolve(dataUrl);
        };
        img.src = imageSrc;
    });
}

convertBtn.onclick = async () => {
    if (typeof cv === 'undefined' || !cv.Mat) return alert("Sabar, OpenCV sedang loading...");
    
    const doc = new jsPDF();
    const activeImages = imageList.filter(img => img !== null);
    const quality = qSlider.value;
    const selectedFilter = filterSelect.value; // Ambil pilihan filter dari dropdown

    for (let i = 0; i < activeImages.length; i++) {
        if (i > 0) doc.addPage();
        const processedData = await processImage(activeImages[i], selectedFilter, quality);
        const pWidth = doc.internal.pageSize.getWidth();
        const pHeight = doc.internal.pageSize.getHeight();
        doc.addImage(processedData, 'JPEG', 0, 0, pWidth, pHeight, undefined, 'FAST');
    }

    const pdfOutput = doc.output('blob');
    const fileSizeMB = pdfOutput.size / (1024 * 1024);

    if (fileSizeMB > 2 && quality > 0.5) {
        const konfirmasi = confirm(`Ukuran file: ${fileSizeMB.toFixed(2)} MB. Tetap simpan?`);
        if (!konfirmasi) return; 
    }

    doc.save('Hasil_Scan_AyubR_2026.pdf');
};
