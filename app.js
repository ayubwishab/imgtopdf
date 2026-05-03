const { jsPDF } = window.jspdf;
let imageList = [];
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const video = document.getElementById('video-feed');
const snapBtn = document.getElementById('snap-btn');
const qSlider = document.getElementById('q-slider');
const qLabel = document.getElementById('q-label');
const filterSelect = document.getElementById('filter-select');
const filenameInput = document.getElementById('filename-input');

// Update label slider dengan estimasi kategori ukuran
qSlider.oninput = function() { 
    let val = parseFloat(this.value);
    let estimasi = val <= 0.3 ? "(Kecil)" : (val <= 0.6 ? "(Sedang)" : "(Tinggi)");
    qLabel.innerText = Math.round(val * 100) + "% " + estimasi; 
};

// Input file dari galeri
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

// Logika Kamera
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

// Pemrosesan Gambar dengan Filter & Proteksi Blank Putih
async function processImage(imageSrc, filter, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                let src = cv.imread(img);
                let dst = new cv.Mat();
                
                // 1. Resize otomatis ke 1200px agar file ringan
                let width = src.cols;
                let height = src.rows;
                const MAX_WIDTH = 1200; 
                if (width > MAX_WIDTH) {
                    height = Math.round(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                    cv.resize(src, src, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
                }

                // 2. Aplikasi Filter
                if (filter === 'enhanced') {
                    src.convertTo(dst, -1, 1.1, 5); // Kecerahan & Kontras
                } else if (filter === 'bw') {
                    let temp = new cv.Mat();
                    cv.cvtColor(src, temp, cv.COLOR_RGBA2GRAY);
                    cv.adaptiveThreshold(temp, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 25);
                    temp.delete();
                } else {
                    dst = src.clone(); // Mode Normal
                }

                cv.imshow('canvasOutput', dst);
                const dataUrl = document.getElementById('canvasOutput').toDataURL('image/jpeg', parseFloat(quality));
                
                src.delete(); dst.delete();
                resolve(dataUrl);
            } catch (err) {
                console.error("OpenCV Error, menggunakan gambar asli:", err);
                resolve(imageSrc); // Fallback: kirim gambar asli jika gagal agar tidak blank
            }
        };
        img.src = imageSrc;
    });
}

// Logika Simpan PDF dengan Custom Nama & Deteksi Ukuran
convertBtn.onclick = async () => {
    if (typeof cv === 'undefined' || !cv.Mat) {
        return alert("Modul Scanner sedang bersiap, tunggu sebentar lalu klik lagi.");
    }
    
    const activeImages = imageList.filter(img => img !== null);
    if (activeImages.length === 0) return;

    const doc = new jsPDF();
    const quality = qSlider.value;
    const selectedFilter = filterSelect.value;
    
    // Logika Penamaan File
    const userFileName = filenameInput.value.trim();
    const finalFileName = userFileName ? `${userFileName}.pdf` : 'Hasil_Scan_AyubR_2026.pdf';

    convertBtn.innerText = "Memproses...";
    convertBtn.disabled = true;

    try {
        for (let i = 0; i < activeImages.length; i++) {
            if (i > 0) doc.addPage();
            
            const processedData = await processImage(activeImages[i], selectedFilter, quality);
            const pWidth = doc.internal.pageSize.getWidth();
            const pHeight = doc.internal.pageSize.getHeight();
            
            doc.addImage(processedData, 'JPEG', 0, 0, pWidth, pHeight, undefined, 'FAST');
        }

        const pdfOutput = doc.output('blob');
        const fileSizeMB = pdfOutput.size / (1024 * 1024);

        // Deteksi ukuran file > 2MB
        if (fileSizeMB > 2 && quality > 0.5) {
            const konfirmasi = confirm(`Ukuran file: ${fileSizeMB.toFixed(2)} MB (Melebihi target 2MB).\n\nTetap simpan?\nAtau klik 'Cancel' dan geser slider ke arah 30%-40% untuk mengecilkan.`);
            if (!confirmasi) {
                resetBtn();
                return;
            }
        }

        doc.save(finalFileName);
    } catch (err) {
        alert("Gagal membuat PDF.");
        console.error(err);
    } finally {
        resetBtn();
    }
};

function resetBtn() {
    convertBtn.innerText = "SIMPAN PDF SEKARANG";
    convertBtn.disabled = false;
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
