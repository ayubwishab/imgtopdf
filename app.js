const { jsPDF } = window.jspdf;
let imageList = [];
const previewContainer = document.getElementById('preview-container');
const convertBtn = document.getElementById('convert-btn');
const video = document.getElementById('video-feed');
const snapBtn = document.getElementById('snap-btn');

// Handle Input Galeri
document.getElementById('file-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => addImageToList(event.target.result);
        reader.readAsDataURL(file);
    });
});

// Fungsi Tambah Gambar ke List & UI
function addImageToList(src) {
    const index = imageList.length;
    imageList.push(src);

    const wrapper = document.createElement('div');
    wrapper.className = 'img-wrapper';
    wrapper.id = `img-wrap-${index}`;

    const img = document.createElement('img');
    img.src = src;

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '×';
    delBtn.className = 'del-btn';
    delBtn.onclick = () => removeImage(index);

    wrapper.appendChild(img);
    wrapper.appendChild(delBtn);
    previewContainer.appendChild(wrapper);
    
    convertBtn.disabled = false;
}

// Fungsi Hapus Gambar
function removeImage(index) {
    imageList[index] = null;
    document.getElementById(`img-wrap-${index}`).remove();
    convertBtn.disabled = !imageList.some(img => img !== null);
}

// Fungsi Kamera
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }, 
            audio: false 
        });
        video.srcObject = stream;
        video.style.display = "block";
        snapBtn.style.display = "inline-block";
        video.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert("Akses kamera ditolak atau tidak tersedia.");
    }
}

snapBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    addImageToList(canvas.toDataURL('image/jpeg', 0.7)); // Kompresi 70%
};

// Generate PDF
convertBtn.onclick = () => {
    const doc = new jsPDF();
    const activeImages = imageList.filter(img => img !== null);
    
    activeImages.forEach((imgData, i) => {
        if (i > 0) doc.addPage();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    });
    
    doc.save('dokumen_hasil_scan.pdf');
};

// Daftarkan Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}