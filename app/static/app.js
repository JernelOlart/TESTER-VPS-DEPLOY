// VPS Tester Suite - Client-side JS

let activeTab = 'dashboard';
let sysInfoInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  switchTab('dashboard');
  refreshAllData();
  setupDragAndDrop();

  // Auto-refresh system stats every 10 seconds
  sysInfoInterval = setInterval(() => {
    loadSystemInfo();
  }, 10000);
});

// Tab Navigation
function switchTab(tabId) {
  activeTab = tabId;
  const tabs = ['dashboard', 'database', 'storage', 'tests', 'system-info', 'deploy-guide'];
  
  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    
    if (t === tabId) {
      section?.classList.remove('hidden');
      navBtn?.classList.add('tab-active');
    } else {
      section?.classList.add('hidden');
      navBtn?.classList.remove('tab-active');
    }
  });

  if (window.lucide) {
    lucide.createIcons();
  }

  // Load specific data depending on tab
  if (tabId === 'database') {
    loadDatabaseData();
  } else if (tabId === 'storage') {
    loadStorageFiles();
    loadSystemInfo();
  } else if (tabId === 'system-info' || tabId === 'dashboard') {
    loadSystemInfo();
  }
}

// Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');

  msgEl.textContent = message;
  
  if (type === 'error') {
    iconEl.className = 'w-5 h-5 text-red-400';
    iconEl.setAttribute('data-lucide', 'alert-circle');
  } else if (type === 'info') {
    iconEl.className = 'w-5 h-5 text-blue-400';
    iconEl.setAttribute('data-lucide', 'info');
  } else {
    iconEl.className = 'w-5 h-5 text-emerald-400';
    iconEl.setAttribute('data-lucide', 'check-circle');
  }

  if (window.lucide) lucide.createIcons();

  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
  }, 3500);
}

// Refresh all sections
async function refreshAllData() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  await Promise.all([
    loadSystemInfo(),
    loadDatabaseData(),
    loadStorageFiles()
  ]);

  setTimeout(() => {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
  }, 500);
}

// ------------------- System Info -------------------
async function loadSystemInfo() {
  try {
    const res = await fetch('/api/system/info');
    if (!res.ok) return;
    const data = await res.json();

    // Top navbar badges
    const topVol = document.getElementById('top-volume-status');
    if (topVol && data.disks?.storage_volume) {
      topVol.textContent = `${data.disks.storage_volume.free_gb} GB libres`;
    }

    // Dashboard Cards
    const cpuPct = data.cpu?.percent || 0;
    document.getElementById('dash-cpu-percent').textContent = `${cpuPct}%`;
    document.getElementById('dash-cpu-cores').textContent = `${data.cpu?.cores_logical || 1} vCPU`;
    document.getElementById('dash-cpu-bar').style.width = `${Math.min(cpuPct, 100)}%`;

    const ramPct = data.memory?.percent || 0;
    document.getElementById('dash-ram-percent').textContent = `${ramPct}%`;
    document.getElementById('dash-ram-usage').textContent = `${data.memory?.used_gb || 0} / ${data.memory?.total_gb || 0} GB`;
    document.getElementById('dash-ram-bar').style.width = `${Math.min(ramPct, 100)}%`;

    const storageDisk = data.disks?.storage_volume;
    if (storageDisk) {
      document.getElementById('dash-storage-percent').textContent = `${storageDisk.percent}%`;
      document.getElementById('dash-storage-free').textContent = `${storageDisk.free_gb} GB libre`;
      document.getElementById('dash-storage-bar').style.width = `${Math.min(storageDisk.percent, 100)}%`;

      // Storage tab gauge
      const svPath = document.getElementById('storage-volume-path');
      const svUsed = document.getElementById('storage-volume-used-text');
      const svPct = document.getElementById('storage-volume-percent-text');
      const svBar = document.getElementById('storage-volume-bar');
      if (svPath) svPath.textContent = storageDisk.path;
      if (svUsed) svUsed.textContent = `${storageDisk.used_gb} GB / ${storageDisk.total_gb} GB`;
      if (svPct) svPct.textContent = `${storageDisk.percent}% ocupado`;
      if (svBar) svBar.style.width = `${Math.min(storageDisk.percent, 100)}%`;
    }

    // Dashboard summary
    document.getElementById('dash-hostname').textContent = data.hostname || '--';
    document.getElementById('dash-os').textContent = `${data.os?.system || ''} ${data.os?.release || ''}`;
    document.getElementById('dash-arch').textContent = data.os?.machine || '--';
    document.getElementById('dash-uptime').textContent = data.uptime?.system_uptime_str || '--';
    document.getElementById('dash-python').textContent = `Python ${data.python_version || ''}`;

    // System Info Tab
    const iHost = document.getElementById('info-hostname');
    if (iHost) {
      iHost.textContent = data.hostname;
      document.getElementById('info-os').textContent = data.os?.platform || data.os?.system;
      document.getElementById('info-kernel').textContent = data.os?.version || data.os?.release;
      document.getElementById('info-arch').textContent = data.os?.machine;
      document.getElementById('info-uptime').textContent = data.uptime?.system_uptime_str;
      document.getElementById('info-app-uptime').textContent = data.uptime?.app_uptime_str;

      document.getElementById('info-cpu-cores').textContent = `${data.cpu?.cores_physical} físicos / ${data.cpu?.cores_logical} lógicos`;
      document.getElementById('info-cpu-percent').textContent = `${data.cpu?.percent}%`;
      document.getElementById('info-ram-total').textContent = `${data.memory?.total_gb} GB`;
      document.getElementById('info-ram-free').textContent = `${data.memory?.free_gb} GB`;
      document.getElementById('info-swap-percent').textContent = `${data.memory?.swap_percent}%`;
      document.getElementById('info-python-ver').textContent = data.python_version;

      // Disks in System info
      if (storageDisk) {
        document.getElementById('info-storage-path').textContent = storageDisk.path;
        document.getElementById('info-storage-cap').textContent = `${storageDisk.total_gb} GB total, ${storageDisk.free_gb} GB libres (${storageDisk.percent}%)`;
        document.getElementById('info-storage-bar').style.width = `${storageDisk.percent}%`;
      }
      const rootDisk = data.disks?.root_volume;
      if (rootDisk) {
        document.getElementById('info-root-cap').textContent = `${rootDisk.total_gb} GB total, ${rootDisk.free_gb} GB libres (${rootDisk.percent}%)`;
        document.getElementById('info-root-bar').style.width = `${rootDisk.percent}%`;
      }
    }
  } catch (err) {
    console.error("Error cargando info del sistema:", err);
  }
}

// ------------------- Database Management -------------------
async function loadDatabaseData() {
  try {
    const [statsRes, itemsRes] = await Promise.all([
      fetch('/api/db/stats'),
      fetch('/api/db/items')
    ]);

    if (statsRes.ok) {
      const stats = await statsRes.json();
      document.getElementById('dash-db-records').textContent = stats.total_items;
      document.getElementById('dash-db-size').textContent = `Tamaño: ${stats.db_size_kb} KB`;

      const dbPath = document.getElementById('db-stat-path');
      if (dbPath) {
        dbPath.textContent = stats.db_path;
        document.getElementById('db-stat-size').textContent = `${stats.db_size_kb} KB`;
        document.getElementById('db-stat-count').textContent = stats.total_items;
        document.getElementById('db-stat-version').textContent = `SQLite ${stats.sqlite_version} (${stats.journal_mode})`;
      }
    }

    if (itemsRes.ok) {
      const items = await itemsRes.json();
      renderItemsTable(items);
    }
  } catch (err) {
    console.error("Error cargando datos de BD:", err);
  }
}

function renderItemsTable(items) {
  const tbody = document.getElementById('items-table-body');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-slate-500 font-mono text-xs">
          No hay registros aún. Usa el formulario arriba o el botón "Generar 5 Registros".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="px-4 py-3 font-mono text-xs text-slate-400">#${item.id}</td>
      <td class="px-4 py-3 font-medium text-slate-200">${escapeHtml(item.title)}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-0.5 rounded text-[11px] font-mono ${getCategoryBadge(item.category)}">
          ${item.category}
        </span>
      </td>
      <td class="px-4 py-3 text-slate-400 text-xs truncate max-w-xs">${escapeHtml(item.content || '-')}</td>
      <td class="px-4 py-3 text-xs text-slate-400 font-mono">${item.created_at}</td>
      <td class="px-4 py-3 text-right">
        <button onclick="deleteItemRecord(${item.id})" class="p-1 hover:text-red-400 text-slate-500 transition" title="Eliminar registro">
          <i data-lucide="trash" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function getCategoryBadge(cat) {
  switch (cat) {
    case 'vps': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'test': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'app': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'storage': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
    default: return 'bg-slate-800 text-slate-300';
  }
}

async function handleAddItem(e) {
  e.preventDefault();
  const title = document.getElementById('item-title').value;
  const content = document.getElementById('item-content').value;
  const category = document.getElementById('item-category').value;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('category', category);

  try {
    const res = await fetch('/api/db/items', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      showToast('Registro guardado correctamente en la BD');
      document.getElementById('item-title').value = '';
      document.getElementById('item-content').value = '';
      loadDatabaseData();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error al guardar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

async function deleteItemRecord(id) {
  if (!confirm(`¿Eliminar registro #${id}?`)) return;
  try {
    const res = await fetch(`/api/db/items/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`Registro #${id} eliminado`);
      loadDatabaseData();
    }
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
}

async function clearDatabase() {
  if (!confirm('¿Seguro que deseas vaciar todos los registros de la base de datos?')) return;
  try {
    const res = await fetch('/api/db/items', { method: 'DELETE' });
    if (res.ok) {
      showToast('Base de datos vaciada con éxito');
      loadDatabaseData();
    }
  } catch (err) {
    showToast('Error al vaciar BD', 'error');
  }
}

async function seedSampleData() {
  const samples = [
    { title: 'Servidor Web Nginx', content: 'Proxy inverso configurado para balanceo de carga', category: 'vps' },
    { title: 'Volumen SSD NVMe', content: 'Montaje /app/storage verificado con permisos de escritura', category: 'storage' },
    { title: 'Benchmark Base de Datos', content: 'Transacción ACID completada satisfactoriamente', category: 'test' },
    { title: 'Certificado SSL Let\'s Encrypt', content: 'Renovación automática programada', category: 'app' },
    { title: 'Monitor de Recursos', content: 'Uso de CPU y RAM dentro de rangos normales', category: 'vps' }
  ];

  for (const s of samples) {
    const fd = new FormData();
    fd.append('title', s.title);
    fd.append('content', s.content);
    fd.append('category', s.category);
    await fetch('/api/db/items', { method: 'POST', body: fd });
  }

  showToast('5 registros de prueba agregados');
  loadDatabaseData();
}

// ------------------- Storage Management -------------------
async function loadStorageFiles() {
  try {
    const res = await fetch('/api/storage/files');
    if (!res.ok) return;
    const data = await res.json();

    const countEl = document.getElementById('storage-files-count');
    if (countEl) countEl.textContent = `${data.total_files} archivo(s)`;

    renderFilesTable(data.files);
  } catch (err) {
    console.error("Error listando archivos:", err);
  }
}

function renderFilesTable(files) {
  const tbody = document.getElementById('files-table-body');
  if (!tbody) return;

  if (!files || files.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-8 text-center text-slate-500 font-mono text-xs">
          El volumen está vacío. Sube un archivo arrastrándolo o ejecutando el test de disco.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = files.map(f => `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="px-4 py-3 font-medium text-slate-200 flex items-center gap-2">
        <i data-lucide="file" class="w-4 h-4 text-indigo-400"></i>
        <span>${escapeHtml(f.name)}</span>
      </td>
      <td class="px-4 py-3 text-xs font-mono text-slate-300">${f.size_kb > 1024 ? f.size_mb + ' MB' : f.size_kb + ' KB'}</td>
      <td class="px-4 py-3 text-xs font-mono text-slate-400">${f.modified}</td>
      <td class="px-4 py-3 text-right space-x-2">
        <a href="/api/storage/download/${encodeURIComponent(f.name)}" download class="inline-flex p-1.5 hover:text-indigo-400 text-slate-400 transition" title="Descargar">
          <i data-lucide="download" class="w-4 h-4"></i>
        </a>
        <button onclick="deleteStorageFile('${escapeJs(f.name)}')" class="inline-flex p-1.5 hover:text-red-400 text-slate-500 transition" title="Eliminar">
          <i data-lucide="trash" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

async function handleFileUpload(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  showToast(`Subiendo ${file.name}...`, 'info');

  try {
    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      showToast(`Archivo ${file.name} guardado en el volumen`);
      loadStorageFiles();
      loadSystemInfo();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error al subir', 'error');
    }
  } catch (err) {
    showToast('Error de conexión al subir archivo', 'error');
  }
}

async function deleteStorageFile(filename) {
  if (!confirm(`¿Eliminar el archivo "${filename}" del volumen?`)) return;

  try {
    const res = await fetch(`/api/storage/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`Archivo ${filename} eliminado del volumen`);
      loadStorageFiles();
      loadSystemInfo();
    }
  } catch (err) {
    showToast('Error al eliminar archivo', 'error');
  }
}

function setupDragAndDrop() {
  const dropzone = document.getElementById('dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-500', 'bg-indigo-500/10');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });
}

// ------------------- Test Suite -------------------
function logTestOutput(text, type = 'info') {
  const consoleEl = document.getElementById('test-console-output');
  if (!consoleEl) return;

  const now = new Date().toLocaleTimeString();
  let color = 'text-slate-300';
  if (type === 'success') color = 'text-emerald-400';
  if (type === 'error') color = 'text-red-400';
  if (type === 'warning') color = 'text-amber-400';

  const line = document.createElement('div');
  line.className = `${color} leading-relaxed`;
  line.innerHTML = `<span class="text-slate-500">[${now}]</span> ${text}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function clearTestLogs() {
  const consoleEl = document.getElementById('test-console-output');
  if (consoleEl) {
    consoleEl.innerHTML = '<div class="text-slate-500">> Consola limpia. Listo para nuevas pruebas.</div>';
  }
}

async function runQuickTest(type) {
  switchTab('tests');
  await executeTest(type);
}

async function executeTest(testType) {
  const btn = document.getElementById(`btn-test-${testType}`);
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Ejecutando...`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    if (testType === 'db') {
      logTestOutput('Iniciando Benchmark de Base de Datos SQLite (500 registros)...');
      const res = await fetch('/api/tests/db-benchmark?count=500', { method: 'POST' });
      const data = await res.json();
      logTestOutput(`✔ Inserción 500 registros: ${data.insert_ms} ms (${data.inserts_per_second} ops/seg)`, 'success');
      logTestOutput(`✔ Consulta de agregación: ${data.read_ms} ms`, 'success');
      logTestOutput(`✔ Limpieza y transacción finalizada en ${data.total_ms} ms total.`, 'success');
      showToast(`Test de BD completado: ${data.inserts_per_second} ops/seg`);
      loadDatabaseData();
    } else if (testType === 'disk') {
      logTestOutput('Iniciando Test de I/O en Volumen (Escribiendo y leyendo 25 MB)...');
      const res = await fetch('/api/tests/disk-benchmark?size_mb=25', { method: 'POST' });
      const data = await res.json();
      logTestOutput(`✔ Velocidad de ESCRITURA en volumen: ${data.write_speed_mb_s} MB/s (${data.write_seconds} s)`, 'success');
      logTestOutput(`✔ Velocidad de LECTURA en volumen: ${data.read_speed_mb_s} MB/s (${data.read_seconds} s)`, 'success');
      showToast(`Test de Disco: Escritura ${data.write_speed_mb_s} MB/s | Lectura ${data.read_speed_mb_s} MB/s`);
    } else if (testType === 'net') {
      logTestOutput('Comprobando conectividad de red, DNS y dirección IP pública...');
      const res = await fetch('/api/tests/network', { method: 'POST' });
      const data = await res.json();
      if (data.dns && data.dns.status === 'OK') {
        logTestOutput(`✔ Resolución DNS (cloudflare.com): ${data.dns.latency_ms} ms (IP: ${data.dns.resolved_ip})`, 'success');
      } else {
        logTestOutput(`✖ Fallo en DNS: ${data.dns?.error}`, 'error');
      }
      logTestOutput(`🌐 IP Pública del VPS: ${data.public_ip}`, 'warning');
      if (data.outbound_http && data.outbound_http.status_code) {
        logTestOutput(`✔ Ping HTTP saliente (1.1.1.1): ${data.outbound_http.latency_ms} ms (HTTP ${data.outbound_http.status_code})`, 'success');
      }
      showToast(`Red verificada - IP Pública: ${data.public_ip}`);
    } else if (testType === 'cpu') {
      logTestOutput('Iniciando prueba de esfuerzo CPU (3 segundos)...');
      const res = await fetch('/api/tests/cpu-load?seconds=3', { method: 'POST' });
      const data = await res.json();
      logTestOutput(`✔ CPU completó ${data.iterations_completed.toLocaleString()} iteraciones en ${data.duration_seconds}s (${data.iterations_per_second.toLocaleString()} iter/seg)`, 'success');
      showToast(`CPU Test: ${data.iterations_per_second.toLocaleString()} iter/seg`);
    }
  } catch (err) {
    logTestOutput(`✖ Error ejecutando test ${testType}: ${err.message}`, 'error');
    showToast(`Fallo en el test: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      if (window.lucide) lucide.createIcons();
    }
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
