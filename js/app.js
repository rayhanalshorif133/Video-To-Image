/**
 * app.js - Video to Image Converter Pro
 * 100% Client-side Video to Image extraction engine.
 * Supports Target FPS, Interval Seconds, Interval Frames, and All Frames extraction,
 * real-time percentage tracking, live preview canvas, ZIP packing and audio notification.
 */

(function () {
  'use strict';

  // State
  const state = {
    file: null,
    videoUrl: null,
    duration: 0,
    width: 0,
    height: 0,
    fps: 30, // Default estimated FPS
    totalEstimatedFrames: 0,
    
    mode: 'fps', // 'fps', 'interval_seconds', 'interval_frames', 'all'
    paramValue: 1.0,
    format: 'image/jpeg',
    quality: 0.95,
    prefix: 'frame',
    namingStyle: 'counter', // 'counter' or 'timestamp'
    
    isProcessing: false,
    isPaused: false,
    isCancelled: false,
    
    targetTimestamps: [],
    extractedImages: [], // { name, blob, url }
    zipInstance: null,
    
    startTime: 0,
    processedCount: 0,
    totalTargetCount: 0
  };

  // DOM Elements
  const el = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    dropZone: document.getElementById('dropZone'),
    videoFileInput: document.getElementById('videoFileInput'),
    browseBtn: document.getElementById('browseBtn'),
    
    videoMetadataCard: document.getElementById('videoMetadataCard'),
    sourceVideo: document.getElementById('sourceVideo'),
    metaFilename: document.getElementById('metaFilename'),
    metaFilesize: document.getElementById('metaFilesize'),
    metaDuration: document.getElementById('metaDuration'),
    metaResolution: document.getElementById('metaResolution'),
    metaFps: document.getElementById('metaFps'),
    metaTotalFrames: document.getElementById('metaTotalFrames'),
    
    modeBadge: document.getElementById('modeBadge'),
    segBtns: document.querySelectorAll('.seg-btn'),
    modeDescription: document.getElementById('modeDescription'),
    paramRow: document.getElementById('paramRow'),
    paramLabel: document.getElementById('paramLabel'),
    paramInput: document.getElementById('paramInput'),
    inputUnit: document.getElementById('inputUnit'),
    presetChips: document.getElementById('presetChips'),
    
    estCount: document.getElementById('estCount'),
    estSize: document.getElementById('estSize'),
    
    imageFormats: document.querySelectorAll('input[name="imageFormat"]'),
    qualityGroup: document.getElementById('qualityGroup'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityVal: document.getElementById('qualityVal'),
    prefixInput: document.getElementById('prefixInput'),
    namingStyles: document.querySelectorAll('input[name="namingStyle"]'),
    counterPreview: document.getElementById('counterPreview'),
    timePreview: document.getElementById('timePreview'),
    
    statusBadge: document.getElementById('statusBadge'),
    percentDisplay: document.getElementById('percentDisplay'),
    progressBarFill: document.getElementById('progressBarFill'),
    countDisplay: document.getElementById('countDisplay'),
    metricSpeed: document.getElementById('metricSpeed'),
    metricElapsed: document.getElementById('metricElapsed'),
    metricEta: document.getElementById('metricEta'),
    
    previewCanvas: document.getElementById('previewCanvas'),
    previewPlaceholder: document.getElementById('previewPlaceholder'),
    offscreenCanvas: document.getElementById('offscreenCanvas'),
    
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    downloadZipBtn: document.getElementById('downloadZipBtn'),
    
    cardGallery: document.getElementById('cardGallery'),
    galleryGrid: document.getElementById('galleryGrid'),
    galleryCountBadge: document.getElementById('galleryCountBadge'),
    downloadZipHeaderBtn: document.getElementById('downloadZipHeaderBtn'),
    
    imageModal: document.getElementById('imageModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalTitle: document.getElementById('modalTitle'),
    modalImg: document.getElementById('modalImg'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalDownloadBtn: document.getElementById('modalDownloadBtn')
  };

  // Canvas contexts
  const offscreenCtx = el.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  const previewCtx = el.previewCanvas.getContext('2d');

  // Mode configurations & descriptions
  const MODES_CONFIG = {
    fps: {
      badge: '🎯 FPS Mode',
      desc: 'প্রতি সেকেন্ডে কয়টি ছবি সেভ হবে তা নির্ধারণ করুন (যেমন: 1.0 = প্রতি সেকেন্ডে ১টি ছবি, 0.5 = প্রতি ২ সেকেন্ডে ১টি ছবি)।',
      label: 'টার্গেট FPS ভ্যালু:',
      unit: 'FPS',
      step: '0.1',
      defaultVal: '1.0',
      presets: [
        { label: '0.25', val: '0.25' },
        { label: '0.5', val: '0.5' },
        { label: '1.0', val: '1.0' },
        { label: '2.0', val: '2.0' },
        { label: '5.0', val: '5.0' },
        { label: 'Native', val: 'native' }
      ]
    },
    interval_seconds: {
      badge: '⏱️ Interval (Seconds)',
      desc: 'প্রতি কতো সেকেন্ড পর পর ১টি ছবি সংরক্ষণ করবেন তা নির্ধারণ করুন (যেমন: প্রতি ১ সেকেন্ড, প্রতি ২.৫ সেকেন্ড)।',
      label: 'ইন্টারভাল (সেকেন্ড):',
      unit: 'Sec',
      step: '0.5',
      defaultVal: '1.0',
      presets: [
        { label: '0.5s', val: '0.5' },
        { label: '1s', val: '1.0' },
        { label: '2s', val: '2.0' },
        { label: '5s', val: '5.0' },
        { label: '10s', val: '10.0' },
        { label: '30s', val: '30.0' }
      ]
    },
    interval_frames: {
      badge: '🎞️ Interval (Frames)',
      desc: 'প্রতি কতো ফ্রেম পর পর ১টি ছবি সংরক্ষণ করবেন (যেমন: প্রতি ১০ ফ্রেম, ৩০ ফ্রেম, ৬০ ফ্রেম পর পর)।',
      label: 'ইন্টারভাল (ফ্রেম সংখ্যা):',
      unit: 'Frames',
      step: '1',
      defaultVal: '30',
      presets: [
        { label: '5', val: '5' },
        { label: '10', val: '10' },
        { label: '15', val: '15' },
        { label: '30', val: '30' },
        { label: '60', val: '60' },
        { label: '120', val: '120' }
      ]
    },
    all: {
      badge: '🌟 All Frames Mode',
      desc: 'ভিডিওর প্রতিটি একক ফ্রেম নিখুঁতভাবে সেভ করা হবে (উচ্চ রেজোলিউশন ও দীর্ঘ ভিডিওর ক্ষেত্রে মেমোরি বেশি লাগতে পারে)।',
      label: '',
      unit: '',
      step: '1',
      defaultVal: 'All',
      presets: []
    }
  };

  // --- Theme Management ---
  function initTheme() {
    const saved = localStorage.getItem('v2i_theme');
    if (saved) {
      el.html.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      el.html.setAttribute('data-theme', 'light');
    }
  }

  el.themeToggleBtn.addEventListener('click', () => {
    const current = el.html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    el.html.setAttribute('data-theme', next);
    localStorage.setItem('v2i_theme', next);
  });

  // --- Audio Notification ---
  function playCompletionChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.35); // D6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio not allowed or supported', e);
    }
  }

  // --- Formatting Helpers ---
  function formatSeconds(secs) {
    if (isNaN(secs) || secs < 0) return '00:00';
    const s = Math.floor(secs);
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const remSecs = s % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatTimestampFilename(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(mins).padStart(2, '0')}m${String(secs).padStart(2, '0')}s_${String(millis).padStart(3, '0')}ms`;
  }

  // --- Video Metadata Extraction ---
  function handleVideoFile(file) {
    if (!file) return;
    state.file = file;
    state.extractedImages = [];
    el.cardGallery.classList.add('hidden');
    el.galleryGrid.innerHTML = '';
    el.downloadZipBtn.classList.add('hidden');

    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }
    state.videoUrl = URL.createObjectURL(file);
    el.sourceVideo.src = state.videoUrl;
    el.sourceVideo.load();

    el.sourceVideo.onloadedmetadata = () => {
      state.duration = el.sourceVideo.duration;
      state.width = el.sourceVideo.videoWidth || 1920;
      state.height = el.sourceVideo.videoHeight || 1080;
      
      // Auto-estimate FPS: Default to 30 or calculate if available
      state.fps = 30.0;
      state.totalEstimatedFrames = Math.max(1, Math.round(state.duration * state.fps));

      // Display metadata
      el.metaFilename.textContent = file.name;
      el.metaFilesize.textContent = formatFileSize(file.size);
      el.metaDuration.textContent = formatSeconds(state.duration);
      el.metaResolution.textContent = `${state.width} × ${state.height}`;
      el.metaFps.textContent = `${state.fps.toFixed(1)} fps (Est.)`;
      el.metaTotalFrames.textContent = `${state.totalEstimatedFrames.toLocaleString()} frames`;

      el.videoMetadataCard.classList.remove('hidden');
      el.startBtn.disabled = false;

      // Adjust preview canvas dimensions
      el.previewCanvas.width = 480;
      el.previewCanvas.height = Math.round((480 * state.height) / state.width) || 270;

      // Reset progress
      resetProgress();
      recalculateEstimate();
    };
  }

  // --- Calculation & Estimation ---
  function recalculateEstimate() {
    if (!state.file || state.duration <= 0) {
      el.estCount.textContent = '০ টি ছবি';
      el.estSize.textContent = '~০.০০ MB';
      return;
    }

    const duration = state.duration;
    const fps = state.fps;
    const mode = state.mode;
    let targetTimestamps = [];

    if (mode === 'all') {
      const total = state.totalEstimatedFrames;
      const step = 1.0 / fps;
      for (let i = 0; i < total; i++) {
        const t = i * step;
        if (t >= duration) break;
        targetTimestamps.push(t);
      }
    } else if (mode === 'fps') {
      let targetFps = parseFloat(state.paramValue) || 1.0;
      if (targetFps <= 0) targetFps = 1.0;
      const step = 1.0 / targetFps;
      for (let t = 0; t < duration; t += step) {
        targetTimestamps.push(t);
      }
    } else if (mode === 'interval_seconds') {
      let intervalSec = parseFloat(state.paramValue) || 1.0;
      if (intervalSec <= 0.05) intervalSec = 0.05;
      for (let t = 0; t < duration; t += intervalSec) {
        targetTimestamps.push(t);
      }
    } else if (mode === 'interval_frames') {
      let intervalFrames = parseInt(state.paramValue, 10) || 30;
      if (intervalFrames < 1) intervalFrames = 1;
      const stepSec = intervalFrames / fps;
      for (let t = 0; t < duration; t += stepSec) {
        targetTimestamps.push(t);
      }
    }

    state.targetTimestamps = targetTimestamps;
    const count = targetTimestamps.length;
    el.estCount.textContent = `${count.toLocaleString()} টি ছবি`;

    // Size estimate calculation
    let bytesPerPixel = 0.12; // default for JPG at 95%
    if (state.format === 'image/png') {
      bytesPerPixel = 1.2;
    } else if (state.format === 'image/webp') {
      bytesPerPixel = 0.08 * (state.quality);
    } else {
      bytesPerPixel = 0.14 * (state.quality);
    }

    const estimatedBytes = count * (state.width * state.height * bytesPerPixel);
    el.estSize.textContent = `~${formatFileSize(estimatedBytes)}`;

    updateNamingPreviews();
  }

  function updateNamingPreviews() {
    const ext = state.format === 'image/png' ? 'png' : (state.format === 'image/webp' ? 'webp' : 'jpg');
    const prefix = state.prefix || 'frame';
    const digits = Math.max(4, String(state.targetTimestamps.length || 1).length);
    el.counterPreview.textContent = `${prefix}_${'0'.repeat(digits - 1)}1.${ext}`;
    el.timePreview.textContent = `${prefix}_00m01s_250ms.${ext}`;
  }

  function resetProgress() {
    el.percentDisplay.textContent = '0%';
    el.progressBarFill.style.width = '0%';
    el.countDisplay.textContent = `০ / ${state.targetTimestamps.length} টি ছবি সংরক্ষিত`;
    el.metricSpeed.textContent = '0.0 fps';
    el.metricElapsed.textContent = '00:00';
    el.metricEta.textContent = '00:00';
    el.statusBadge.textContent = 'প্রস্তুত (Ready)';
    el.statusBadge.className = 'status-indicator ready';
    el.previewPlaceholder.classList.remove('hidden');
  }

  // --- UI Event Handlers ---
  // Drag & drop
  el.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropZone.classList.add('dragover');
  });

  el.dropZone.addEventListener('dragleave', () => {
    el.dropZone.classList.remove('dragover');
  });

  el.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVideoFile(e.dataTransfer.files[0]);
    }
  });

  el.browseBtn.addEventListener('click', () => {
    el.videoFileInput.click();
  });

  el.videoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleVideoFile(e.target.files[0]);
    }
  });

  // Mode Selection
  el.segBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.segBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      setMode(mode);
    });
  });

  function setMode(mode) {
    state.mode = mode;
    const config = MODES_CONFIG[mode];
    el.modeBadge.textContent = config.badge;
    el.modeDescription.textContent = config.desc;

    if (mode === 'all') {
      el.paramRow.classList.add('hidden');
    } else {
      el.paramRow.classList.remove('hidden');
      el.paramLabel.textContent = config.label;
      el.inputUnit.textContent = config.unit;
      el.paramInput.step = config.step;
      el.paramInput.value = config.defaultVal;
      state.paramValue = config.defaultVal;

      // Populate presets
      el.presetChips.innerHTML = '';
      config.presets.forEach((p, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `chip ${idx === 2 ? 'active' : ''}`;
        chip.textContent = p.label;
        chip.setAttribute('data-val', p.val);
        chip.addEventListener('click', () => {
          el.presetChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          if (p.val === 'native') {
            el.paramInput.value = state.fps.toFixed(1);
            state.paramValue = state.fps;
          } else {
            el.paramInput.value = p.val;
            state.paramValue = parseFloat(p.val);
          }
          recalculateEstimate();
        });
        el.presetChips.appendChild(chip);
      });
    }

    recalculateEstimate();
  }

  el.paramInput.addEventListener('input', (e) => {
    state.paramValue = e.target.value;
    el.presetChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    recalculateEstimate();
  });

  // Output settings
  el.imageFormats.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.format = e.target.value;
      if (state.format === 'image/png') {
        el.qualityGroup.style.opacity = '0.4';
        el.qualitySlider.disabled = true;
      } else {
        el.qualityGroup.style.opacity = '1.0';
        el.qualitySlider.disabled = false;
      }
      recalculateEstimate();
    });
  });

  el.qualitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.quality = val / 100;
    el.qualityVal.textContent = `${val}%`;
    recalculateEstimate();
  });

  el.prefixInput.addEventListener('input', (e) => {
    state.prefix = e.target.value.trim() || 'frame';
    updateNamingPreviews();
  });

  el.namingStyles.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.namingStyle = e.target.value;
      updateNamingPreviews();
    });
  });

  // --- Core Extraction Engine ---
  async function startExtraction() {
    if (!state.file || state.targetTimestamps.length === 0) return;

    state.isProcessing = true;
    state.isPaused = false;
    state.isCancelled = false;
    state.extractedImages = [];
    state.zipInstance = new JSZip();

    // UI Updates
    el.startBtn.classList.add('hidden');
    el.pauseBtn.classList.remove('hidden');
    el.cancelBtn.classList.remove('hidden');
    el.downloadZipBtn.classList.add('hidden');
    el.cardGallery.classList.remove('hidden');
    el.galleryGrid.innerHTML = '';
    el.previewPlaceholder.classList.add('hidden');

    el.statusBadge.textContent = 'প্রসেসিং চলছে...';
    el.statusBadge.className = 'status-indicator processing';

    // Prepare offscreen canvas
    el.offscreenCanvas.width = state.width;
    el.offscreenCanvas.height = state.height;

    // Use a dedicated video element for seeking to keep UI responsive
    const extractorVideo = document.createElement('video');
    extractorVideo.muted = true;
    extractorVideo.playsInline = true;
    extractorVideo.preload = 'auto';
    extractorVideo.src = state.videoUrl;

    await new Promise((res) => {
      extractorVideo.onloadeddata = res;
      extractorVideo.load();
    });

    const total = state.targetTimestamps.length;
    state.totalTargetCount = total;
    state.startTime = performance.now();
    state.processedCount = 0;

    const digits = Math.max(4, String(total).length);
    const ext = state.format === 'image/png' ? 'png' : (state.format === 'image/webp' ? 'webp' : 'jpg');

    for (let i = 0; i < total; i++) {
      if (state.isCancelled) break;

      // Handle Pause
      while (state.isPaused && !state.isCancelled) {
        await new Promise((res) => setTimeout(res, 100));
      }

      const timestamp = state.targetTimestamps[i];

      // Fast seek with timeout fallback
      await new Promise((resolve) => {
        let isDone = false;
        const onSeeked = () => {
          if (!isDone) {
            isDone = true;
            extractorVideo.removeEventListener('seeked', onSeeked);
            resolve();
          }
        };
        extractorVideo.addEventListener('seeked', onSeeked, { once: true });
        extractorVideo.currentTime = Math.min(timestamp, state.duration - 0.001);

        // Fallback safety timeout if browser seek event stalls
        setTimeout(() => {
          if (!isDone) {
            isDone = true;
            extractorVideo.removeEventListener('seeked', onSeeked);
            resolve();
          }
        }, 500);
      });

      if (state.isCancelled) break;

      // Draw onto offscreen canvas
      offscreenCtx.drawImage(extractorVideo, 0, 0, state.width, state.height);

      // Draw preview canvas
      previewCtx.drawImage(extractorVideo, 0, 0, el.previewCanvas.width, el.previewCanvas.height);

      // Generate filename
      let filename = '';
      if (state.namingStyle === 'timestamp') {
        filename = `${state.prefix}_${formatTimestampFilename(timestamp)}.${ext}`;
      } else {
        filename = `${state.prefix}_${String(i + 1).padStart(digits, '0')}.${ext}`;
      }

      // Convert canvas to blob
      const blob = await new Promise((res) => {
        el.offscreenCanvas.toBlob(res, state.format, state.quality);
      });

      if (blob) {
        // Add to zip
        state.zipInstance.file(filename, blob);

        const imgObj = {
          name: filename,
          blob: blob,
          url: URL.createObjectURL(blob),
          index: i + 1
        };
        state.extractedImages.push(imgObj);

        // Add to gallery (limit immediate DOM rendering to first 120 items to preserve performance)
        if (i < 120) {
          addGalleryItem(imgObj);
        }
      }

      state.processedCount = i + 1;
      updateLiveProgress(i + 1, total);
    }

    // Cleanup extractor video
    extractorVideo.src = '';

    // Finalize
    finishExtraction();
  }

  function updateLiveProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    el.percentDisplay.textContent = `${percent}%`;
    el.progressBarFill.style.width = `${percent}%`;
    el.countDisplay.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} টি ছবি সংরক্ষিত`;
    el.galleryCountBadge.textContent = `${current.toLocaleString()} টি ছবি`;

    const now = performance.now();
    const elapsedSecs = (now - state.startTime) / 1000;
    const speed = elapsedSecs > 0 ? (current / elapsedSecs) : 0;
    const remainingFrames = total - current;
    const etaSecs = speed > 0 ? (remainingFrames / speed) : 0;

    el.metricSpeed.textContent = `${speed.toFixed(1)} fps`;
    el.metricElapsed.textContent = formatSeconds(elapsedSecs);
    el.metricEta.textContent = formatSeconds(etaSecs);
  }

  function finishExtraction() {
    state.isProcessing = false;
    state.isPaused = false;

    el.pauseBtn.classList.add('hidden');
    el.cancelBtn.classList.add('hidden');
    el.startBtn.classList.remove('hidden');

    if (state.isCancelled) {
      el.statusBadge.textContent = 'বাতিল করা হয়েছে (Cancelled)';
      el.statusBadge.className = 'status-indicator';
      el.statusBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
      el.statusBadge.style.color = '#ef4444';
    } else {
      el.statusBadge.textContent = 'সম্পন্ন হয়েছে (Completed)!';
      el.statusBadge.className = 'status-indicator completed';
      playCompletionChime();
    }

    if (state.extractedImages.length > 0) {
      el.downloadZipBtn.classList.remove('hidden');
      el.downloadZipHeaderBtn.classList.remove('hidden');

      // If more than 120 images, append reminder in gallery
      if (state.extractedImages.length > 120 && el.galleryGrid.children.length === 120) {
        const moreNote = document.createElement('div');
        moreNote.style.gridColumn = '1 / -1';
        moreNote.style.textAlign = 'center';
        moreNote.style.padding = '1rem';
        moreNote.style.color = 'var(--text-muted)';
        moreNote.textContent = `... এবং আরও ${(state.extractedImages.length - 120).toLocaleString()} টি ছবি ZIP ফাইলে সংরক্ষিত আছে।`;
        el.galleryGrid.appendChild(moreNote);
      }
    }
  }

  // --- Gallery & Modal Management ---
  function addGalleryItem(item) {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.innerHTML = `
      <div class="gallery-thumb-wrap">
        <img src="${item.url}" alt="${item.name}" loading="lazy">
      </div>
      <div class="gallery-item-footer">
        <span class="gallery-filename" title="${item.name}">${item.name}</span>
        <button type="button" class="gallery-download-btn" title="Download">⬇️</button>
      </div>
    `;

    // Click on thumbnail to view full image
    card.querySelector('.gallery-thumb-wrap').addEventListener('click', () => {
      openModal(item);
    });

    // Individual download button
    card.querySelector('.gallery-download-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadSingleImage(item);
    });

    el.galleryGrid.appendChild(card);
  }

  function downloadSingleImage(item) {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openModal(item) {
    el.modalTitle.textContent = item.name;
    el.modalImg.src = item.url;
    el.modalDownloadBtn.href = item.url;
    el.modalDownloadBtn.download = item.name;
    el.imageModal.classList.remove('hidden');
  }

  function closeModal() {
    el.imageModal.classList.add('hidden');
    el.modalImg.src = '';
  }

  el.modalCloseBtn.addEventListener('click', closeModal);
  el.modalBackdrop.addEventListener('click', closeModal);

  // --- ZIP Packaging & Download ---
  async function downloadZip() {
    if (!state.zipInstance || state.extractedImages.length === 0) return;

    const originalText = el.downloadZipBtn.innerHTML;
    el.downloadZipBtn.disabled = true;
    el.downloadZipHeaderBtn.disabled = true;
    el.downloadZipBtn.innerHTML = '<span>⏳ জিপ তৈরি হচ্ছে... (Compressing ZIP)</span>';

    try {
      const zipContent = await state.zipInstance.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        el.downloadZipBtn.innerHTML = `<span>⏳ জিপ তৈরি হচ্ছে: ${Math.round(metadata.percent)}%</span>`;
      });

      const zipName = `${state.file ? state.file.name.replace(/\.[^/.]+$/, "") : 'video'}_frames.zip`;
      const zipUrl = URL.createObjectURL(zipContent);

      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(zipUrl), 60000);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('ZIP তৈরিতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      el.downloadZipBtn.disabled = false;
      el.downloadZipHeaderBtn.disabled = false;
      el.downloadZipBtn.innerHTML = originalText;
    }
  }

  // --- Control Buttons ---
  el.startBtn.addEventListener('click', startExtraction);

  el.pauseBtn.addEventListener('click', () => {
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
      el.pauseBtn.innerHTML = '<span class="btn-icon">▶️</span><span>রেজুম (Resume)</span>';
      el.statusBadge.textContent = 'পজ করা আছে (Paused)';
      el.statusBadge.className = 'status-indicator';
    } else {
      el.pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span><span>পজ (Pause)</span>';
      el.statusBadge.textContent = 'প্রসেসিং চলছে...';
      el.statusBadge.className = 'status-indicator processing';
    }
  });

  el.cancelBtn.addEventListener('click', () => {
    state.isCancelled = true;
    state.isPaused = false;
  });

  el.downloadZipBtn.addEventListener('click', downloadZip);
  el.downloadZipHeaderBtn.addEventListener('click', downloadZip);

  // Keyboard accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.imageModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Init
  initTheme();
  setMode('fps');
})();
