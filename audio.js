// audio.js - Hệ thống tạo hiệu ứng âm thanh 8-bit bằng Web Audio API (Tương thích Web & Mobile)
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    return audioCtx;
}

// Mở khóa âm thanh cho thiết bị di động (iOS Safari / Android Chrome) ngay từ lần chạm đầu tiên
function unlockAudio() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
}
window.addEventListener('click', unlockAudio, { passive: true });
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('pointerdown', unlockAudio, { passive: true });

function playSound(type) {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    try {
        let osc = ctx.createOscillator();
        let gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        let now = ctx.currentTime;

        if (type === 'shoot') {
            // Tiếng trụ bắn (âm cao, ngắn)
            osc.type = 'square';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
            gainNode.gain.setValueAtTime(0.09, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } 
        else if (type === 'hit') {
            // Tiếng quái trúng đạn / nổ nhỏ
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.linearRampToValueAtTime(35, now + 0.1);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } 
        else if (type === 'click') {
            // Tiếng click nút giao diện
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(800, now + 0.03);
            gainNode.gain.setValueAtTime(0.06, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } 
        else if (type === 'build') {
            // Tiếng đặt tường / trụ
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(360, now + 0.1);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {
        // Tránh lỗi audio crash trên các trình duyệt cũ
    }
}
