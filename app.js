const { jsPDF } = window.jspdf;
let imageList = [];
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const video = document.getElementById('video-feed');
const snapBtn = document.getElementById('snap-btn');

// 1. Handling Input
document.getElementById('file-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
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

// 2. Camera Logic
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

// 3. Pro Image Processing (OpenCV)
async function processImagePro(imageSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let src = cv.imread(img);
            let dst = new cv.Mat();
            
            // Convert to Gray
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
            
            // Adaptive Thresholding (Membuat background putih bersih & teks hitam pekat)
            cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 15);
            
            cv.imshow('canvasOutput', dst);
            const dataUrl = document.getElementById('canvasOutput').toDataURL('image/jpeg', 0.7);
            
            src.delete(); dst.delete();
            resolve(dataUrl);
        };
        img.src = imageSrc;
    });
}

// 4. Generate PDF
convertBtn.onclick = async () => {
    if (typeof cv === 'undefined' || !cv.Mat) {
        alert("Sabar, modul Scanner Pro sedang dimuat...");
        return;
    }
    
    const doc = new jsPDF();
    const activeImages = imageList.filter(img => img !== null);
    
    for (let i = 0; i < activeImages.length; i++) {
        if (i > 0) doc.addPage();
        
        const processedData = await processImagePro(activeImages[i]);
        
        const pWidth = doc.internal.pageSize.getWidth();
        const pHeight = doc.internal.pageSize.getHeight();
        
        doc.addImage(processedData, 'JPEG', 0, 0, pWidth, pHeight);
    }
    doc.save('Hasil_Scan_Pro.pdf');
};

// PWA Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
