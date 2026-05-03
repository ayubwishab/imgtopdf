const { jsPDF } = window.jspdf;
let imageList = [];
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const video = document.getElementById('video-feed');
const snapBtn = document.getElementById('snap-btn');
const qSlider = document.getElementById('q-slider');
const qLabel = document.getElementById('q-label');

// Update label slider dengan estimasi kategori ukuran
qSlider.oninput = function() { 
    let val = parseFloat(this.value);
    let estimasi = "";
    
    if (val <= 0.3) {
        estimasi = "(Kecil: < 1.5MB)";
    } else if (val <= 0.6) {
        estimasi = "(Sedang: 1.5MB - 3MB)";
    } else {
        estimasi = "(Kualitas Tinggi: > 3MB)";
    }
    
    qLabel.innerText = Math.round(val * 100) + "% " + estimasi; 
};

// Input file dari galeri[cite: 4]
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

// Logika Kamera[cite: 4]
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.style.display = "block";
        snapBtn.style.display = "block";
        video.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { alert("Akses kamera ditolak."); }
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    addImageToList(canvas.toDataURL('image/jpeg', 0.8));
}

// Pengolahan Gambar Pro (OpenCV)[cite: 4]
async function processScan(imageSrc, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let src = cv.imread(img);
            let gray = new cv.Mat();
            let dst = new cv.Mat();
            
            // Resize otomatis ke 1200px agar tidak langsung bengkak
            let width = src.cols;
            let height = src.rows;
            const MAX_WIDTH = 1200; 
            if (width > MAX_WIDTH) {
                height = Math.round(height * (MAX_WIDTH / width));
                width = MAX_WIDTH;
                cv.resize(src, src, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
            }

            // Adaptive Thresholding untuk hasil BW bersih[cite: 4]
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
            cv.adaptiveThreshold(gray, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 25);
            
            cv.imshow('canvasOutput', dst);
            
            // Kompresi sesuai nilai slider[cite: 4]
            const dataUrl = document.getElementById('canvasOutput').toDataURL('image/jpeg', parseFloat(quality));
            
            src.delete(); gray.delete(); dst.delete();
            resolve(dataUrl);
        };
        img.src = imageSrc;
    });
}

// Logika Simpan dengan Cek Ukuran Otomatis
convertBtn.onclick = async () => {
    if (typeof cv === 'undefined' || !cv.Mat) return alert("Sabar, modul scanner sedang memuat...");
    
    const doc = new jsPDF();
    const activeImages = imageList.filter(img => img !== null);
    const quality = qSlider.value;

    for (let i = 0; i < activeImages.length; i++) {
        if (i > 0) doc.addPage();
        const processedData = await processScan(activeImages[i], quality);
        const pWidth = doc.internal.pageSize.getWidth();
        const pHeight = doc.internal.pageSize.getHeight();
        
        doc.addImage(processedData, 'JPEG', 0, 0, pWidth, pHeight, undefined, 'FAST');
    }

    // Hitung ukuran file PDF sebelum download[cite: 3]
    const pdfOutput = doc.output('blob');
    const fileSizeMB = pdfOutput.size / (1024 * 1024);

    // Jika ukuran > 2MB dan user belum melakukan kompresi rendah, beri pilihan[cite: 3, 4]
    if (fileSizeMB > 2 && quality > 0.5) {
        const konfirmasi = confirm(`Ukuran file terdeteksi ${fileSizeMB.toFixed(2)} MB (Melebihi target 2MB).\n\nIngin tetap simpan?\nAtau klik 'Cancel' dan geser slider ke arah 30%-40% untuk mengecilkan.`);
        if (!konfirmasi) return; 
    }

    doc.save('Hasil_Scan_AyubR_2026.pdf');
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
