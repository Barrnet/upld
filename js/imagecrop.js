const config = {
    cropDefaultW: 600,
    cropDefaultH: 300,
    cropMinW: 100,
    cropMinH: 100,
    zoomMin: 0.10,
    zoomMax: 4,
    zoomStart: 1,
    zoomWheelSpeed: 1.05,
    zoomPinchSpeed: 0.002,
    overlayDarkness: 0.55,
    overlayPatternAlpha: 0.35,
    patternSize: 4,
    patternColor: "rgba(0,0,0,0.6)"
};

const canvas = document.getElementById("crop-canvas");
const ctx = canvas.getContext("2d");

// Normalizza le coordinate del mouse rispetto alle dimensioni logiche del canvas
// (necessario quando il canvas è ridimensionato via CSS)
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}
let img = new Image();
let originalMime = null;

let scale = config.zoomStart;
const zoomSlider = document.getElementById("zoom-slider");
const zoomLabel = document.getElementById("zoom-label");

let posX = 0, posY = 0;
let isDraggingImage = false, isDraggingCrop = false, isResizing = false;
let startX, startY;

let cropW = config.cropDefaultW, cropH = config.cropDefaultH;
let cropX = (canvas.width - cropW) / 2;
let cropY = (canvas.height - cropH) / 2;

const HANDLE = 16;
let activeHandle = null;

const handles = { tl:{}, tr:{}, bl:{}, br:{}, tm:{}, bm:{}, ml:{}, mr:{} };
let overlayPattern = null;

function createOverlayPattern() {
    const p = document.createElement("canvas");
    const c = p.getContext("2d");
    p.width = config.patternSize;
    p.height = config.patternSize;
    c.strokeStyle = config.patternColor;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, config.patternSize);
    c.lineTo(config.patternSize, 0);
    c.stroke();
    return ctx.createPattern(p, "repeat");
}

function clampImageToCanvas() {
    const imgW = img.width * scale;
    const imgH = img.height * scale;

    if (imgW >= canvas.width) {
        // immagine più larga del canvas: tienila ai bordi
        if (posX > 0) posX = 0;
        if (posX + imgW < canvas.width) posX = canvas.width - imgW;
    } else {
        // immagine più stretta: lasciala muovere liberamente nel canvas
        if (posX < 0) posX = 0;
        if (posX + imgW > canvas.width) posX = canvas.width - imgW;
    }

    if (imgH >= canvas.height) {
        if (posY > 0) posY = 0;
        if (posY + imgH < canvas.height) posY = canvas.height - imgH;
    } else {
        if (posY < 0) posY = 0;
        if (posY + imgH > canvas.height) posY = canvas.height - imgH;
    }
}

function loadImageFromBlob(blob) {
    originalMime = blob.type || "image/png";
    const reader = new FileReader();
    reader.onload = ev => {
        img.onload = () => {
            canvas.width = 800;
            canvas.height = 800;

            scale = config.zoomStart;
            posX = posY = 0;

            cropW = config.cropDefaultW;
            cropH = config.cropDefaultH;
            cropX = (canvas.width - cropW) / 2;
            cropY = (canvas.height - cropH) / 2;

            zoomSlider.value = config.zoomStart * 100;
            zoomLabel.textContent = zoomSlider.value + "%";

            overlayPattern = createOverlayPattern();

            // Mostra il box del cropper
            document.getElementById("preview-box").classList.remove("hidden");

            draw();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(blob);
}

document.getElementById("image-input").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadImageFromBlob(file);
});

// Caricamento da URL (opzionale: solo se i relativi elementi esistono nel DOM)
const loadUrlBtn = document.getElementById("load-url");
if (loadUrlBtn) {
    loadUrlBtn.addEventListener("click", () => {
        const url = document.getElementById("image-url").value.trim();
        if (!url) return;
        fetch(url)
            .then(res => res.blob())
            .then(blob => loadImageFromBlob(blob))
            .catch(() => alert("Impossibile caricare l'immagine dal link"));
    });
}

function updateHandles() {
    const hs = HANDLE / 2;
    handles.tl.x = cropX - hs; handles.tl.y = cropY - hs;
    handles.tr.x = cropX + cropW - hs; handles.tr.y = cropY - hs;
    handles.bl.x = cropX - hs; handles.bl.y = cropY + cropH - hs;
    handles.br.x = cropX + cropW - hs; handles.br.y = cropY + cropH - hs;
    handles.tm.x = cropX + cropW / 2 - hs; handles.tm.y = cropY - hs;
    handles.bm.x = cropX + cropW / 2 - hs; handles.bm.y = cropY + cropH - hs;
    handles.ml.x = cropX - hs; handles.ml.y = cropY + cropH / 2 - hs;
    handles.mr.x = cropX + cropW - hs; handles.mr.y = cropY + cropH / 2 - hs;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, posX, posY, img.width * scale, img.height * scale);

    ctx.fillStyle = `rgba(0,0,0,${config.overlayDarkness})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = config.overlayPatternAlpha;
    ctx.fillStyle = overlayPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropW, cropH);
    ctx.clip();
    ctx.drawImage(img, posX, posY, img.width * scale, img.height * scale);
    ctx.restore();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(cropX, cropY - 22, 120, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    ctx.fillText(`${cropW}×${cropH}`, cropX + 5, cropY - 7);

    updateHandles();
    ctx.fillStyle = "#fff";
    for (let h in handles) {
        const mh = handles[h];
        ctx.fillRect(mh.x, mh.y, HANDLE, HANDLE);
        ctx.strokeRect(mh.x, mh.y, HANDLE, HANDLE);
    }
}

zoomSlider.addEventListener("input", () => {
    scale = zoomSlider.value / 100;
    clampImageToCanvas();
    zoomLabel.textContent = zoomSlider.value + "%";
    draw();
});

canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const wpos = getCanvasPos(e);
    const mx = wpos.x, my = wpos.y;
    const old = scale;
    scale *= e.deltaY < 0 ? config.zoomWheelSpeed : 1 / config.zoomWheelSpeed;
    scale = Math.min(config.zoomMax, Math.max(config.zoomMin, scale));
    const f = scale / old;
    posX = mx - (mx - posX) * f;
    posY = my - (my - posY) * f;
    clampImageToCanvas();
    zoomSlider.value = Math.round(scale * 100);
    zoomLabel.textContent = zoomSlider.value + "%";
    draw();
});

let lastTouchDist = null;
canvas.addEventListener("touchmove", e => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist) {
            scale += (dist - lastTouchDist) * config.zoomPinchSpeed;
            scale = Math.min(config.zoomMax, Math.max(config.zoomMin, scale));
            zoomSlider.value = Math.round(scale * 100);
            zoomLabel.textContent = zoomSlider.value + "%";
            clampImageToCanvas();
        }
        lastTouchDist = dist;
        draw();
    }
});
canvas.addEventListener("touchend", () => lastTouchDist = null);

canvas.addEventListener("mousedown", e => {
    const pos = getCanvasPos(e);
    startX = pos.x;
    startY = pos.y;
    for (let h in handles) {
        const mh = handles[h];
        if (startX >= mh.x && startX <= mh.x + HANDLE && startY >= mh.y && startY <= mh.y + HANDLE) {
            activeHandle = h;
            isResizing = true;
            return;
        }
    }
    if (startX >= cropX && startX <= cropX + cropW && startY >= cropY && startY <= cropY + cropH) {
        isDraggingCrop = true;
        return;
    }
    isDraggingImage = true;
});

canvas.addEventListener("mousemove", e => {
    const pos = getCanvasPos(e);
    const dx = pos.x - startX;
    const dy = pos.y - startY;

    if (isResizing && activeHandle) {
        switch (activeHandle) {
            case "tl": cropX += dx; cropY += dy; cropW -= dx; cropH -= dy; break;
            case "tr": cropY += dy; cropW += dx; cropH -= dy; break;
            case "bl": cropX += dx; cropW -= dx; cropH += dy; break;
            case "br": cropW += dx; cropH += dy; break;
            case "tm": cropY += dy; cropH -= dy; break;
            case "bm": cropH += dy; break;
            case "ml": cropX += dx; cropW -= dx; break;
            case "mr": cropW += dx; break;
        }
        if (cropW < config.cropMinW) cropW = config.cropMinW;
        if (cropH < config.cropMinH) cropH = config.cropMinH;
        startX = pos.x;
        startY = pos.y;
        clampImageToCanvas();
        draw();
        return;
    }

    if (isDraggingCrop) {
        cropX += dx;
        cropY += dy;
        startX = pos.x;
        startY = pos.y;
        draw();
        return;
    }

    if (isDraggingImage) {
        posX += dx;
        posY += dy;
        clampImageToCanvas();
        startX = pos.x;
        startY = pos.y;
        draw();
    }
});

canvas.addEventListener("mouseup", () => {
    isDraggingCrop = false;
    isDraggingImage = false;
    isResizing = false;
    activeHandle = null;
});

document.getElementById("recenter-image").addEventListener("click", () => {
	const imgW = img.width * scale;
    const imgH = img.height * scale;
    posX = (canvas.width - imgW) / 2;
    posY = (canvas.height - imgH) / 2;
    clampImageToCanvas();
    draw();
});

document.getElementById("crop-reset").addEventListener("click", () => {
    cropW = config.cropDefaultW;
    cropH = config.cropDefaultH;
    cropX = (canvas.width - cropW) / 2;
    cropY = (canvas.height - cropH) / 2;
    draw();
});

document.getElementById("crop-confirm").addEventListener("click", () => {
    const out = document.createElement("canvas");
    const o = out.getContext("2d");
    out.width = cropW;
    out.height = cropH;

    o.drawImage(
        img,
        (cropX - posX) / scale,
        (cropY - posY) / scale,
        cropW / scale,
        cropH / scale,
        0, 0, cropW, cropH
    );

    out.toBlob(blob => {
        let ext = "png";
        if (originalMime === "image/jpeg") ext = "jpg";
        if (originalMime === "image/webp") ext = "webp";
        if (originalMime === "image/gif") ext = "png";
        if (originalMime === "image/x-icon") ext = "png";

        const file = new File([blob], `cropped.${ext}`, { type: originalMime });
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById("image-input").files = dt.files;

        // Nascondi il cropper e procedi con l'upload
        document.getElementById("preview-box").classList.add("hidden");
        $('#upload-form').submit();
    }, originalMime);
});
