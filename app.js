const { jsPDF } = window.jspdf;
let imageList = [];
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const video = document.getElementById('video-feed');
const snapBtn = document.getElementById('snap-btn');
const qSlider = document.getElementById('q-slider');
const qLabel = document.getElementById('q-label');

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
    } catch (err) { alert("Kamera error/akses ditolak."); }
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    addImageToList(canvas.toDataURL('image/jpeg', 0.8));
}

async function processScan(imageSrc, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let src = cv.imread(img);
            let gray = new cv.Mat();
            let dst = new cv.Mat();
            
            // 1. KOMPRESI SIZE: Resize jika terlalu besar
            let width = src.cols;
            let height = src.rows;
            const MAX_RES = 1200; 
            if (width > MAX_RES) {
                height = Math.round(height * (MAX_RES / width));
                width = MAX_RES;
                cv.resize(src, src, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
            }

            // 2. SCAN EFFECT: BW Bersih ala Dokumen
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
            cv.adaptiveThreshold(gray, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 51, 25);
            
            cv.imshow('canvasOutput', dst);
            // 3. KOMPRESI KUALITAS: Sesuai Slider
            const dataUrl = document.getElementById('canvasOutput').toDataURL('image/jpeg', parseFloat(quality));
            
            src.delete(); gray.delete(); dst.delete();
            resolve(dataUrl);
        };
        img.src = imageSrc;
    });
}

convertBtn.onclick = async () => {
    if (typeof cv === 'undefined' || !cv.Mat) return alert("Tunggu, modul Scanner sedang memuat...");
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
    doc.save('Hasil_Scan_Pro.pdf');
};

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }
