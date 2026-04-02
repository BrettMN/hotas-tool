/* HOTAS Tool — Frontend Application */
'use strict';

// ── Dialog polling ────────────────────────────────────────────────────────────
// Dialogs are spawned non-blocking; they write their result to a temp file.
// ipc_pollDialogResult() reads the file synchronously — no async needed.
// We poll every 150ms from the frontend until the file appears.
async function awaitDialog(tmpFile) {
  while (true) {
    const r = await ipc_pollDialogResult(tmpFile);
    if (r.ready) return r.result;
    await new Promise(res => setTimeout(res, 150));
  }
}

// ── IPC helpers ───────────────────────────────────────────────────────────────
const ipc = {
  getDevices:            ()                    => ipc_getDevices(),
  getDeviceControls:     (id)                  => ipc_getDeviceControls(id),
  getScActions:          ()                    => ipc_getScActions(),
  getConfig:             ()                    => ipc_getConfig(),
  saveConfig:            (cfg)                 => ipc_saveConfig(cfg),
  getDefaultScInstallDir:()                    => ipc_getDefaultScInstallDir(),
  browseForFolder:       async (desc, dir)     => awaitDialog(await ipc_browseForFolder(desc, dir)),
  browseForFile:         async (dir)           => awaitDialog(await ipc_browseForFile(dir)),
  browseForSave:         async (name)          => awaitDialog(await ipc_browseForSave(name)),
  pollDialogResult:      (tmp)                 => ipc_pollDialogResult(tmp),
  scanScChannels:        (dir)                 => ipc_scanScChannels(dir),
  listProfiles:          (dir)                 => ipc_listScProfiles(dir),
  loadFile:              (path)                => ipc_loadFile(path),
  saveFile:              (file, binds)         => ipc_saveFile(file, binds),
  saveFileAs:            (file, binds, path)   => ipc_saveFileAs(file, binds, path),
  getTemplateSvg:        (deviceId)            => ipc_getTemplateSvg(deviceId),
  debugLog:              (...args)             => ipc_debugLog(...args),
};

// ── Application state ─────────────────────────────────────────────────────────
const state = {
  devices: [],        // DeviceDefinition[]
  deviceControls: {}, // { [deviceId]: { controls, svgViewBox, svgOutlinePaths } }
  scActions: [],      // ScAction[]
  config: null,       // DeviceConfig
  loadedFile: null,   // ScActionmapFile | null
  bindings: [],       // ScBinding[] — current (possibly unsaved) bindings
  dirty: false,       // unsaved changes
  activeTab: 'diagram',
  // SC install
  scInstallDir: null, // string | null
  scChannels: [],     // ScChannel[]
  activeChannel: null,// ScChannel | null
  channelProfiles: [],// string[] — XML file paths in active channel
  // Binding editor state
  editorControl: null,
  editorStick: null,  // 'right' | 'left'
};

// ── Template label → SC input suffix mapping ──────────────────────────────────
// Maps diagrams.net SVG label text to the SC input suffix used in "js{N}_{suffix}"
const TEMPLATE_LABEL_MAP = {
  // Buttons 1–29
  'BUTTON_1': 'button1',   'BUTTON_2': 'button2',   'BUTTON_3': 'button3',
  'BUTTON_4': 'button4',   'BUTTON_5': 'button5',   'BUTTON_6': 'button6',
  'BUTTON_7': 'button7',   'BUTTON_8': 'button8',   'BUTTON_9': 'button9',
  'BUTTON_10': 'button10', 'BUTTON_11': 'button11', 'BUTTON_12': 'button12',
  'BUTTON_13': 'button13', 'BUTTON_14': 'button14', 'BUTTON_15': 'button15',
  'BUTTON_16': 'button16', 'BUTTON_17': 'button17', 'BUTTON_18': 'button18',
  'BUTTON_19': 'button19', 'BUTTON_20': 'button20', 'BUTTON_21': 'button21',
  'BUTTON_22': 'button22', 'BUTTON_23': 'button23', 'BUTTON_24': 'button24',
  'BUTTON_25': 'button25', 'BUTTON_26': 'button26', 'BUTTON_27': 'button27',
  'BUTTON_28': 'button28', 'BUTTON_29': 'button29',
  // POV hat directions (8-way)
  'POV_1_U':  'hat1_up',        'POV_1_D':  'hat1_down',
  'POV_1_L':  'hat1_left',      'POV_1_R':  'hat1_right',
  'POV_1_UR': 'hat1_upright',   'POV_1_DR': 'hat1_downright',
  'POV_1_DL': 'hat1_downleft',  'POV_1_LL': 'hat1_upleft',
  // Axes
  'AXIS_X / AXIS_Y': 'x',  'AXIS_X': 'x',  'AXIS_Y': 'y',  'AXIS_RZ': 'rz',
};

// ── Initialise ────────────────────────────────────────────────────────────────
async function init() {
  // Attach DOM event listeners FIRST — UI must be interactive regardless of IPC state
  setupEventListeners();

  try {
    [state.devices, state.scActions, state.config] = await Promise.all([
      ipc.getDevices(),
      ipc.getScActions(),
      ipc.getConfig(),
    ]);

    populateDeviceSelects();
    populateCategoryFilters();
    applyConfigToUI(state.config);

    await refreshDeviceControls();
    await renderDiagram();
    renderList();

    // Auto-scan if we have a saved install directory
    if (state.config.scInstallDir) {
      await scanAndShowChannels(state.config.scInstallDir, false);
    }
  } catch (err) {
    showInitError(String(err));
    console.error(err);
  }
}

function showInitError(msg) {
  document.getElementById('tab-diagram').innerHTML =
    `<div style="padding:32px;color:#e53935;font-family:monospace;white-space:pre-wrap">` +
    `<b>Startup error</b>\n\n${msg}\n\nMake sure you ran:\n  deno task dev\n\nfrom the hotas-tool directory.</div>`;
}

// ── Event listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // File operations
  document.getElementById('btn-open').addEventListener('click', openFile);
  document.getElementById('btn-save').addEventListener('click', saveFile);
  document.getElementById('btn-save-as').addEventListener('click', saveFileAs);
  document.getElementById('btn-load-profile').addEventListener('click', loadSelectedProfile);
  document.getElementById('btn-change-install').addEventListener('click', openFile);

  // Legend toggle
  document.getElementById('legend-toggle').addEventListener('click', () => {
    const legend = document.getElementById('diagram-legend');
    const btn    = document.getElementById('legend-toggle');
    const collapsed = legend.classList.toggle('collapsed');
    btn.textContent = collapsed ? '▶' : '◀';
    btn.title       = collapsed ? 'Show legend' : 'Hide legend';
  });

  // Config mode radios
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      const dual = r.value === 'dual';
      document.getElementById('left-config-card').classList.toggle('hidden', !dual);
    });
  });

  // Save config
  document.getElementById('btn-save-config').addEventListener('click', saveDeviceConfig);

  // List view filters
  document.getElementById('list-search').addEventListener('input', renderList);
  document.getElementById('list-filter-stick').addEventListener('change', renderList);
  document.getElementById('list-filter-category').addEventListener('change', renderList);
  document.getElementById('list-show-unbound').addEventListener('change', renderList);

  // Binding modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-binding').addEventListener('click', closeModal);
  document.getElementById('btn-clear-binding').addEventListener('click', clearBinding);
  document.getElementById('modal-search').addEventListener('input', renderModalActionsList);
  document.getElementById('modal-category-filter').addEventListener('change', renderModalActionsList);

  // Close modal on overlay click
  document.getElementById('binding-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('binding-modal')) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// Called after scActions are loaded
function populateCategoryFilters() {
  const categories = [...new Set(state.scActions.map(a => a.category))].sort();

  const catSelect = document.getElementById('list-filter-category');
  catSelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });

  const modalCatSelect = document.getElementById('modal-category-filter');
  modalCatSelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    modalCatSelect.appendChild(opt);
  });
}

// ── Tab management ────────────────────────────────────────────────────────────
async function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
  if (tab === 'diagram') await renderDiagram();
  if (tab === 'list')    renderList();
}

// ── Device config ─────────────────────────────────────────────────────────────
function populateDeviceSelects() {
  ['right-device-select', 'left-device-select'].forEach((selId, idx) => {
    const preferredHand = idx === 0 ? 'right' : 'left';
    const sel = document.getElementById(selId);
    sel.innerHTML = '';
    state.devices.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
    // Pre-select the device matching the preferred hand for this slot
    const preferred = state.devices.find(d => d.hand === preferredHand);
    if (preferred) sel.value = preferred.id;
  });
}

function applyConfigToUI(config) {
  const isDual = config.mode === 'dual';
  document.querySelector(`input[name="mode"][value="${config.mode}"]`).checked = true;
  document.getElementById('left-config-card').classList.toggle('hidden', !isDual);

  if (config.rightStick) {
    document.getElementById('right-device-select').value = config.rightStick.deviceId;
    document.getElementById('right-instance-select').value = String(config.rightStick.jsInstance);
    document.getElementById('right-omni').checked = config.rightStick.omniThrottle;
    document.getElementById('right-instance-badge').textContent = `JS${config.rightStick.jsInstance}`;
  }

  if (config.leftStick) {
    document.getElementById('left-device-select').value = config.leftStick.deviceId;
    document.getElementById('left-instance-select').value = String(config.leftStick.jsInstance);
    document.getElementById('left-omni').checked = config.leftStick.omniThrottle;
    document.getElementById('left-instance-badge').textContent = `JS${config.leftStick.jsInstance}`;
  }

  document.getElementById('panel-left-stick').classList.toggle('hidden', !isDual);
}

async function saveDeviceConfig() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const newConfig = {
    mode,
    rightStick: {
      deviceId: document.getElementById('right-device-select').value,
      jsInstance: parseInt(document.getElementById('right-instance-select').value),
      omniThrottle: document.getElementById('right-omni').checked,
    },
  };
  if (mode === 'dual') {
    newConfig.leftStick = {
      deviceId: document.getElementById('left-device-select').value,
      jsInstance: parseInt(document.getElementById('left-instance-select').value),
      omniThrottle: document.getElementById('left-omni').checked,
    };
  }
  state.config = newConfig;
  await ipc.saveConfig(newConfig);

  // Re-fetch controls for potentially new devices
  await refreshDeviceControls();

  applyConfigToUI(newConfig);
  await renderDiagram();
  renderList();
  showToast('Configuration saved', 'success');
}

async function refreshDeviceControls() {
  const deviceIds = new Set();
  if (state.config.rightStick) deviceIds.add(state.config.rightStick.deviceId);
  if (state.config.leftStick)  deviceIds.add(state.config.leftStick.deviceId);

  await Promise.all([...deviceIds].map(async id => {
    if (!state.deviceControls[id]) {
      state.deviceControls[id] = await ipc.getDeviceControls(id);
    }
  }));
}

// ── File operations ───────────────────────────────────────────────────────────

/** Browse for SC install directory, scan channels, populate the install bar. */
async function openFile() {
  const btn = document.getElementById('btn-open');
  btn.disabled = true;
  btn.textContent = '📂 Opening…';
  try {
    const defaultDir = state.scInstallDir ?? await ipc.getDefaultScInstallDir();
    ipc.debugLog('browseForFolder: defaultDir =', defaultDir);
    const dir = await ipc.browseForFolder('Select Star Citizen Install Directory', defaultDir);
    ipc.debugLog('browseForFolder result:', dir);
    if (!dir) {
      showToast('No folder selected — open cancelled', 'info');
      return;
    }
    await scanAndShowChannels(dir, true);
  } catch (err) {
    ipc.debugLog('openFile error:', String(err));
    showToast(`Open failed: ${err}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📂 Open';
  }
}

/**
 * Scan installDir for SC channels and populate the install bar.
 * If autoLoad is true and there is exactly one profile in the first channel, auto-load it.
 */
async function scanAndShowChannels(installDir, autoLoad) {
  ipc.debugLog('scanScChannels: scanning', installDir);
  const result = await ipc.scanScChannels(installDir);
  ipc.debugLog('scanScChannels result:', JSON.stringify(result));

  if (!result.ok) {
    showToast(`Scan failed: ${result.error}`, 'error');
    return;
  }
  const channels = result.channels;
  if (channels.length === 0) {
    showToast(
      `No SC channels found in: ${installDir}\n` +
      `Expected subdirectories like LIVE or EVOCATI inside that folder.`,
      'error'
    );
    return;
  }

  state.scInstallDir = installDir;
  state.scChannels = channels;

  // Persist in config
  if (state.config) {
    state.config.scInstallDir = installDir;
    await ipc.saveConfig(state.config);
  }

  // Render channel toggle buttons
  const tabContainer = document.getElementById('channel-tabs');
  tabContainer.innerHTML = '';
  channels.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'channel-tab';
    btn.textContent = ch.name;
    btn.dataset.channel = ch.name;
    btn.addEventListener('click', () => switchChannel(ch));
    tabContainer.appendChild(btn);
  });

  // Show the install bar
  const bar = document.getElementById('sc-install-bar');
  bar.classList.remove('hidden');
  const pathEl = document.getElementById('sc-install-path');
  pathEl.textContent = installDir;
  pathEl.title = installDir;

  // Activate first channel
  await switchChannel(channels[0], autoLoad);
}

/** Switch to a different channel and refresh the profile dropdown. */
async function switchChannel(channel, autoLoad = false) {
  state.activeChannel = channel;

  // Update tab button states
  document.querySelectorAll('.channel-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.channel === channel.name);
  });

  // Populate profile dropdown
  const profiles = await ipc.listProfiles(channel.mappingsPath);
  state.channelProfiles = profiles;

  const select = document.getElementById('profile-select');
  select.innerHTML = '';
  if (profiles.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No profiles found';
    opt.disabled = true;
    select.appendChild(opt);
    document.getElementById('btn-load-profile').disabled = true;
  } else {
    profiles.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p.split('\\').pop().replace(/\.xml$/i, '');
      select.appendChild(opt);
    });
    document.getElementById('btn-load-profile').disabled = false;

    if (autoLoad && profiles.length === 1) {
      await loadFilePath(profiles[0]);
    }
  }
}

/** Load whichever profile is currently selected in the dropdown. */
async function loadSelectedProfile() {
  const select = document.getElementById('profile-select');
  if (!select.value) return;
  await loadFilePath(select.value);
}

async function loadFilePath(path) {
  const result = await ipc.loadFile(path);
  if (!result.success) {
    showToast(`Failed to load: ${result.error}`, 'error');
    return;
  }
  state.loadedFile = result.file;
  state.bindings = [...result.file.bindings];
  state.dirty = false;

  updateFileBar();
  document.getElementById('btn-save').disabled = false;
  document.getElementById('btn-save-as').disabled = false;

  await renderDiagram();
  renderList();
  showToast(`Loaded: ${path.split('\\').pop()}`, 'success');
}

async function saveFile() {
  if (!state.loadedFile) return;
  const result = await ipc.saveFile(state.loadedFile, state.bindings);
  if (!result.success) {
    showToast(`Save failed: ${result.error}`, 'error');
    return;
  }
  state.dirty = false;
  updateFileBar();
  showToast('Saved successfully', 'success');
}

async function saveFileAs() {
  if (!state.loadedFile) return;
  const newPath = await ipc.browseForSave(state.loadedFile.profileName);
  if (!newPath) return;
  const result = await ipc.saveFileAs(state.loadedFile, state.bindings, newPath);
  if (!result.success) {
    showToast(`Save failed: ${result.error}`, 'error');
    return;
  }
  state.loadedFile = { ...state.loadedFile, filePath: newPath };
  state.dirty = false;
  updateFileBar();
  showToast(`Saved as: ${newPath.split('\\').pop()}`, 'success');
}

function updateFileBar() {
  const bar = document.getElementById('file-bar');
  if (!state.loadedFile) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  document.getElementById('file-name').textContent =
    state.loadedFile.filePath.split('\\').pop() + (state.dirty ? ' ●' : '');
  document.getElementById('file-profile').textContent = state.loadedFile.profileName;
  document.getElementById('binding-count').textContent =
    `${state.bindings.length} bindings`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getBindingForInput(fullInput) {
  return state.bindings.find(b => b.input === fullInput) ?? null;
}

function getBindingForControl(control, jsInstance) {
  const fullInput = `js${jsInstance}_${control.scInput}`;
  return getBindingForInput(fullInput);
}

function fullInputForControl(control, jsInstance) {
  return `js${jsInstance}_${control.scInput}`;
}

function shortActionName(name) {
  return name.replace(/^v_/, '').replace(/_/g, ' ');
}

// Filter out axis controls that aren't enabled (e.g. slider when no omni throttle)
function getActiveControls(deviceId, omniThrottle) {
  const dc = state.deviceControls[deviceId];
  if (!dc) return [];
  return dc.controls.filter(c => {
    if (c.id === 'axis_slider' && !omniThrottle) return false;
    return true;
  });
}

// ── SVG Diagram ───────────────────────────────────────────────────────────────
async function renderDiagram() {
  await renderStickDiagram('right');
  if (state.config?.mode === 'dual') {
    await renderStickDiagram('left');
  }
}

async function renderStickDiagram(side) {
  const stickCfg = side === 'right' ? state.config?.rightStick : state.config?.leftStick;
  if (!stickCfg) return;
  const dc = state.deviceControls[stickCfg.deviceId];
  if (!dc) return;
  const jsInstance = stickCfg.jsInstance;
  const controls = getActiveControls(stickCfg.deviceId, stickCfg.omniThrottle);
  const container = document.getElementById(`svg-${side}`);

  // Try template SVG first — if available, use it
  const svgContent = await ipc.getTemplateSvg(stickCfg.deviceId);
  if (svgContent) {
    renderTemplateDiagram(side, svgContent, stickCfg.deviceId, jsInstance);
    return;
  }

  // Fall back to programmatic SVG
  container.classList.remove('template-mode');
  container.innerHTML = buildStickSvg(dc, controls, jsInstance, side);
  container.querySelectorAll('.ctrl-group[data-control-id]').forEach(el => {
    el.addEventListener('click', () => {
      const controlId = el.dataset.controlId;
      const control = controls.find(c => c.id === controlId);
      if (control) openBindingEditor(control, jsInstance, side);
    });
  });
}

function renderTemplateDiagram(side, svgContent, deviceId, jsInstance) {
  const container = document.getElementById(`svg-${side}`);

  // Strip XML preamble / DOCTYPE — browser needs just the <svg> tag
  const cleaned = svgContent.replace(/^[\s\S]*?(<svg\s)/, '$1');
  container.innerHTML = cleaned;
  container.classList.add('template-mode');

  const svg = container.querySelector('svg');
  if (!svg) return;

  // Make SVG responsive
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.height = 'auto';

  const deviceCtrls = state.deviceControls[deviceId];

  // Each button: <rect .../><g><switch><foreignObject>…</foreignObject><text x y>LABEL</text></switch></g>
  // The <text> inside <switch> is the fallback label — use it to find the button name & position.
  // NOTE: In HTML-parsed SVG, <switch> may become HTMLUnknownElement.
  //       Use a broader selector and filter for <text> elements whose parent is a <switch>.
  const allTexts = svg.querySelectorAll('text');
  allTexts.forEach(textEl => {
    const label = textEl.textContent.trim();
    const scInputSuffix = TEMPLATE_LABEL_MAP[label];
    if (!scInputSuffix) return;

    // Look up the SC binding for this input
    const fullInput = `js${jsInstance}_${scInputSuffix}`;
    const binding = state.bindings.find(b => b.input === fullInput);
    const actionName = binding ? shortActionName(binding.action) : null;

    // Get position from the <text> fallback element
    const tx = parseFloat(textEl.getAttribute('x') || '0');
    const ty = parseFloat(textEl.getAttribute('y') || '0');

    const switchEl = textEl.parentElement;    // <switch> or parent
    const groupEl  = switchEl?.parentElement; // <g>

    // Modify foreignObject <font> content to include binding text below label
    const foreignObj = switchEl?.querySelector('foreignObject, foreignobject');
    if (foreignObj) {
      const fontEl = foreignObj.querySelector('font');
      if (fontEl) {
        const bindHtml = actionName
          ? `<span style="display:block;color:#42a5f5;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:76px;margin-top:1px">${esc(actionName)}</span>`
          : `<span style="display:block;color:#555;font-size:8px;margin-top:1px">—</span>`;
        fontEl.innerHTML = `<span style="font-size:9px">${esc(label)}</span>${bindHtml}`;
      }
    }

    // Also add an overlay <text> for the binding below the label as a fallback
    if (actionName) {
      const bindText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      bindText.setAttribute('x', String(tx));
      bindText.setAttribute('y', String(ty + 13));
      bindText.setAttribute('fill', '#42a5f5');
      bindText.setAttribute('font-family', 'Helvetica');
      bindText.setAttribute('font-size', '9px');
      bindText.setAttribute('text-anchor', 'middle');
      const maxLen = 14;
      bindText.textContent = actionName.length > maxLen ? actionName.slice(0, maxLen) + '…' : actionName;
      svg.appendChild(bindText);
    }

    // Make the <g> clickable
    if (groupEl) {
      groupEl.style.cursor = 'pointer';
      groupEl.addEventListener('click', () => _openTemplateBindingEditor(label, scInputSuffix, deviceId, jsInstance, side));
    }

    // Activate and style the sibling <rect> (invisible hit target from diagrams.net)
    const siblingRect = groupEl?.nextElementSibling;
    if (siblingRect && siblingRect.tagName.toLowerCase() === 'rect') {
      siblingRect.setAttribute('pointer-events', 'all');
      siblingRect.style.cursor = 'pointer';
      if (binding) {
        siblingRect.setAttribute('fill', 'rgba(30,136,229,0.2)');
        siblingRect.setAttribute('stroke', '#1e88e5');
        siblingRect.setAttribute('stroke-width', '1');
      } else {
        siblingRect.setAttribute('fill', 'rgba(0,0,0,0)');
      }
      siblingRect.addEventListener('click', () => _openTemplateBindingEditor(label, scInputSuffix, deviceId, jsInstance, side));
    }
  });
}

function _openTemplateBindingEditor(label, scInputSuffix, deviceId, jsInstance, side) {
  const deviceCtrls = state.deviceControls[deviceId];
  const ctrl = (deviceCtrls?.controls || []).find(c => c.scInput === scInputSuffix)
    || { id: scInputSuffix, name: label, scInput: scInputSuffix, type: 'button', svgX: 0, svgY: 0 };
  openBindingEditor(ctrl, jsInstance, side);
}
function buildStickSvg(dc, controls, jsInstance, side) {
  const [,, vbW, vbH] = dc.svgViewBox.split(' ').map(Number);

  // Group controls by whether they need hat rendering
  const hatGroups = groupHatControls(controls);
  const regularControls = controls.filter(c => !isHatDirection(c));

  let svgContent = '';

  // Draw outline
  for (const path of dc.svgOutlinePaths) {
    svgContent += `<path class="stick-outline" d="${path}" />`;
  }

  // Draw hat direction groups
  for (const [groupKey, hatControls] of Object.entries(hatGroups)) {
    svgContent += renderHatGroup(hatControls, jsInstance, groupKey);
  }

  // Draw regular controls (buttons + axes)
  for (const ctrl of regularControls) {
    const binding = getBindingForControl(ctrl, jsInstance);
    svgContent += renderControlDot(ctrl, binding, jsInstance);
  }

  // Draw axis labels at bottom
  const axisControls = controls.filter(c => c.type === 'axis');
  svgContent += renderAxisLegend(axisControls, jsInstance, vbW, vbH);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${dc.svgViewBox}">${svgContent}</svg>`;
}

function isHatDirection(ctrl) {
  return ctrl.type === 'hat_direction';
}

function groupHatControls(controls) {
  const groups = {};
  for (const ctrl of controls) {
    if (!isHatDirection(ctrl)) continue;
    // Group by hat number (first part of id before _)
    const hatKey = ctrl.id.replace(/_[a-z]+$/, ''); // e.g. "h1", "h2"
    if (!groups[hatKey]) groups[hatKey] = [];
    groups[hatKey].push(ctrl);
  }
  return groups;
}

// Hat direction arrow rendering
function renderHatGroup(hatControls, jsInstance, groupKey) {
  // Compute center from average of positions
  const xs = hatControls.map(c => c.svgX);
  const ys = hatControls.map(c => c.svgY);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;

  let svg = '';
  // Draw background ring
  svg += `<circle cx="${cx}" cy="${cy}" r="20" class="hat-ring" />`;

  for (const ctrl of hatControls) {
    const binding = getBindingForControl(ctrl, jsInstance);
    const isBound = !!binding;
    const fullInput = fullInputForControl(ctrl, jsInstance);
    const arrowPath = getHatArrow(ctrl.id, cx, cy);
    const label = getHatDirectionLabel(ctrl.id);

    svg += `
      <g class="ctrl-group" data-control-id="${ctrl.id}" data-full-input="${fullInput}" style="cursor:pointer">
        <path d="${arrowPath}" class="hat-arrow ${isBound ? 'bound' : ''}" />
        ${isBound ? `<title>${label}: ${shortActionName(binding.action)}</title>` : `<title>${label}: unbound</title>`}
      </g>`;
  }

  // Push button if present in this group
  const pushCtrl = hatControls.find(c => c.id.endsWith('_push'));
  if (!pushCtrl) {
    // Group label
    const hatNum = groupKey.replace('h', 'H');
    svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" class="ctrl-label" style="font-size:8px">${hatNum}</text>`;
  }

  return svg;
}

function getHatDirectionLabel(ctrlId) {
  if (ctrlId.endsWith('_up'))        return '↑';
  if (ctrlId.endsWith('_down'))      return '↓';
  if (ctrlId.endsWith('_left'))      return '←';
  if (ctrlId.endsWith('_right'))     return '→';
  if (ctrlId.endsWith('_upleft'))    return '↖';
  if (ctrlId.endsWith('_upright'))   return '↗';
  if (ctrlId.endsWith('_downleft'))  return '↙';
  if (ctrlId.endsWith('_downright')) return '↘';
  if (ctrlId.endsWith('_push'))      return '●';
  return '?';
}

function getHatArrow(ctrlId, cx, cy) {
  const r = 14; // radius from center
  const s = 5;  // arrow half-size

  if (ctrlId.endsWith('_up'))        return arrowAt(cx,    cy-r, 'up');
  if (ctrlId.endsWith('_down'))      return arrowAt(cx,    cy+r, 'down');
  if (ctrlId.endsWith('_left'))      return arrowAt(cx-r,  cy,   'left');
  if (ctrlId.endsWith('_right'))     return arrowAt(cx+r,  cy,   'right');
  if (ctrlId.endsWith('_upleft'))    return arrowAt(cx-r*0.7, cy-r*0.7, 'upleft');
  if (ctrlId.endsWith('_upright'))   return arrowAt(cx+r*0.7, cy-r*0.7, 'upright');
  if (ctrlId.endsWith('_downleft'))  return arrowAt(cx-r*0.7, cy+r*0.7, 'downleft');
  if (ctrlId.endsWith('_downright')) return arrowAt(cx+r*0.7, cy+r*0.7, 'downright');
  return `M${cx-4},${cy-4} L${cx+4},${cy-4} L${cx+4},${cy+4} L${cx-4},${cy+4}Z`; // push = square
}

function arrowAt(x, y, dir) {
  const s = 5;
  x = Math.round(x); y = Math.round(y);
  switch(dir) {
    case 'up':        return `M${x},${y-s} L${x+s},${y+s} L${x-s},${y+s}Z`;
    case 'down':      return `M${x},${y+s} L${x+s},${y-s} L${x-s},${y-s}Z`;
    case 'left':      return `M${x-s},${y} L${x+s},${y-s} L${x+s},${y+s}Z`;
    case 'right':     return `M${x+s},${y} L${x-s},${y-s} L${x-s},${y+s}Z`;
    case 'upleft':    return `M${x-s},${y-s} L${x+s},${y} L${x},${y+s}Z`;
    case 'upright':   return `M${x+s},${y-s} L${x-s},${y} L${x},${y+s}Z`;
    case 'downleft':  return `M${x-s},${y+s} L${x+s},${y} L${x},${y-s}Z`;
    case 'downright': return `M${x+s},${y+s} L${x-s},${y} L${x},${y-s}Z`;
    default:          return `M${x-4},${y-4} L${x+4},${y-4} L${x+4},${y+4} L${x-4},${y+4}Z`;
  }
}

function renderControlDot(ctrl, binding, jsInstance) {
  if (ctrl.type === 'axis') return ''; // axes rendered in legend
  const { svgX: x, svgY: y, name, id } = ctrl;
  const isBound = !!binding;
  const fullInput = fullInputForControl(ctrl, jsInstance);
  const dotClass = isBound ? 'bound' : 'unbound';
  const r = ctrl.id.startsWith('h') ? 6 : 9; // hats smaller

  // Abbreviate name for diagram label
  const label = abbreviate(name);
  // Label placement: to the right unless near right edge (x > 160 → left)
  const labelX = x > 160 ? x - r - 3 : x + r + 4;
  const labelAnchor = x > 160 ? 'end' : 'start';

  let svg = `
    <g class="ctrl-group" data-control-id="${id}" data-full-input="${fullInput}" style="cursor:pointer">
      <circle cx="${x}" cy="${y}" r="${r + 6}" class="ctrl-hit" />
      <circle cx="${x}" cy="${y}" r="${r}" class="ctrl-dot ${dotClass}" />
      <text x="${labelX}" y="${y}" text-anchor="${labelAnchor}" class="ctrl-label ${isBound ? 'bound' : ''}">${esc(label)}</text>`;

  if (isBound) {
    const actionLabel = shortActionName(binding.action);
    const maxLen = 18;
    const truncated = actionLabel.length > maxLen ? actionLabel.slice(0, maxLen) + '…' : actionLabel;
    svg += `<text x="${labelX}" y="${y + 11}" text-anchor="${labelAnchor}" class="ctrl-binding-label">${esc(truncated)}</text>`;
  }

  svg += `<title>${name}: ${isBound ? shortActionName(binding.action) : 'unbound'}</title>`;
  svg += `</g>`;
  return svg;
}

function renderAxisLegend(axisControls, jsInstance, vbW, vbH) {
  if (axisControls.length === 0) return '';
  let svg = '';
  const startY = vbH - axisControls.length * 16 - 8;
  axisControls.forEach((ctrl, i) => {
    const binding = getBindingForControl(ctrl, jsInstance);
    const fullInput = fullInputForControl(ctrl, jsInstance);
    const y = startY + i * 16;
    const isBound = !!binding;
    svg += `
      <g class="ctrl-group" data-control-id="${ctrl.id}" data-full-input="${fullInput}" style="cursor:pointer">
        <rect x="6" y="${y - 7}" width="${vbW - 12}" height="14" rx="3" fill="${isBound ? 'rgba(255,152,0,0.15)' : 'rgba(255,255,255,0.03)'}" stroke="${isBound ? '#ff9800' : '#2d3148'}" stroke-width="1"/>
        <circle cx="18" cy="${y}" r="4" class="ctrl-dot axis" />
        <text x="26" y="${y}" dominant-baseline="middle" class="ctrl-label" style="font-size:9px;fill:#ff9800">${esc(ctrl.name)}</text>
        ${isBound ? `<text x="${vbW - 10}" y="${y}" text-anchor="end" dominant-baseline="middle" class="ctrl-binding-label" style="font-size:9px">${esc(shortActionName(binding.action))}</text>` : ''}
        <title>${ctrl.name}: ${isBound ? shortActionName(binding.action) : 'unbound'}</title>
      </g>`;
  });
  return svg;
}

function abbreviate(name) {
  const abbrevs = {
    'Trigger (Stage 1)': 'Trig 1',
    'Trigger (Stage 2)': 'Trig 2',
    'Thumb (A1)': 'Thumb',
    'Pinky (D1)': 'Pinky',
    'H1 Push': 'H1 ●',
    'H2 Push': 'H2 ●',
  };
  return abbrevs[name] || name.replace(' (Stage ', ' S').replace(')', '').replace('Throttle', 'Throt.');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── List View ─────────────────────────────────────────────────────────────────
function renderList() {
  const tbody = document.getElementById('bindings-tbody');
  const searchVal = document.getElementById('list-search').value.toLowerCase();
  const stickFilter = document.getElementById('list-filter-stick').value;
  const catFilter = document.getElementById('list-filter-category').value;
  const unboundOnly = document.getElementById('list-show-unbound').checked;

  const rows = [];

  function addStick(side) {
    const stickCfg = side === 'right' ? state.config?.rightStick : state.config?.leftStick;
    if (!stickCfg) return;
    const dc = state.deviceControls[stickCfg.deviceId];
    if (!dc) return;
    const controls = getActiveControls(stickCfg.deviceId, stickCfg.omniThrottle);

    for (const ctrl of controls) {
      const fullInput = fullInputForControl(ctrl, stickCfg.jsInstance);
      const binding = getBindingForControl(ctrl, stickCfg.jsInstance);
      const action = binding ? state.scActions.find(a => a.name === binding.action) : null;

      if (unboundOnly && binding) continue;
      if (catFilter !== 'all' && action?.category !== catFilter) continue;

      const searchTarget = `${ctrl.name} ${fullInput} ${binding?.action ?? ''} ${action?.category ?? ''}`.toLowerCase();
      if (searchVal && !searchTarget.includes(searchVal)) continue;

      rows.push({ ctrl, fullInput, binding, action, stickCfg, side });
    }
  }

  if (stickFilter !== 'left')  addStick('right');
  if (stickFilter !== 'right') addStick('left');
  if (state.config?.mode !== 'dual' && stickFilter !== 'right') {
    // Only render left if dual mode
  }

  tbody.innerHTML = rows.map(({ ctrl, fullInput, binding, action, stickCfg, side }) => {
    const catLabel = action?.category ?? '';
    return `<tr>
      <td class="td-control">
        <div>${esc(ctrl.name)}</div>
        <div class="td-group">${esc(ctrl.group ?? '')} · ${side === 'right' ? 'Right' : 'Left'}</div>
      </td>
      <td><span class="input-chip">${esc(fullInput)}</span></td>
      <td>${binding
        ? `<span class="action-name">${esc(binding.action)}</span>`
        : `<span class="action-unbound">— unbound —</span>`}</td>
      <td>${catLabel ? `<span class="category-badge">${esc(catLabel)}</span>` : ''}</td>
      <td style="text-align:center">
        <button class="btn-edit" data-control-id="${esc(ctrl.id)}" data-side="${side}"
          onclick="openBindingEditorById('${esc(ctrl.id)}','${side}')">Edit</button>
      </td>
    </tr>`;
  }).join('');

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No controls match the current filters.</td></tr>`;
  }
}

// ── Binding Editor ────────────────────────────────────────────────────────────
function openBindingEditor(control, jsInstance, side) {
  state.editorControl = control;
  state.editorStick = side;

  const fullInput = fullInputForControl(control, jsInstance);
  const binding = getBindingForControl(control, jsInstance);

  document.getElementById('modal-title').textContent = 'Edit Binding';
  document.getElementById('modal-control-name').textContent = control.name;
  document.getElementById('modal-input-code').textContent = fullInput;
  document.getElementById('modal-current-binding').textContent =
    binding ? binding.action : 'None';

  document.getElementById('modal-search').value = '';
  document.getElementById('modal-category-filter').value = 'all';
  renderModalActionsList();

  document.getElementById('binding-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-search').focus(), 50);
}

function openBindingEditorById(controlId, side) {
  const stickCfg = side === 'right' ? state.config?.rightStick : state.config?.leftStick;
  if (!stickCfg) return;
  const controls = getActiveControls(stickCfg.deviceId, stickCfg.omniThrottle);
  const ctrl = controls.find(c => c.id === controlId);
  if (ctrl) openBindingEditor(ctrl, stickCfg.jsInstance, side);
}

function renderModalActionsList() {
  const search = document.getElementById('modal-search').value.toLowerCase();
  const catFilter = document.getElementById('modal-category-filter').value;

  const filtered = state.scActions.filter(a => {
    if (catFilter !== 'all' && a.category !== catFilter) return false;
    if (search && !a.name.toLowerCase().includes(search) && !a.description.toLowerCase().includes(search)) return false;
    return true;
  });

  const stickCfg = state.editorStick === 'right' ? state.config?.rightStick : state.config?.leftStick;
  const jsInstance = stickCfg?.jsInstance ?? 1;
  const fullInput = state.editorControl ? fullInputForControl(state.editorControl, jsInstance) : '';
  const currentBinding = getBindingForInput(fullInput);

  const list = document.getElementById('modal-actions-list');
  list.innerHTML = filtered.slice(0, 200).map(a => {
    const isSelected = currentBinding?.action === a.name;
    return `<div class="action-item ${isSelected ? 'selected' : ''}" data-action="${esc(a.name)}" onclick="selectAction('${esc(a.name)}')">
      <span class="action-item-name">${esc(a.name)}</span>
      <span class="action-item-desc">${esc(a.description)}</span>
      <span class="action-item-cat">${esc(a.category)}</span>
    </div>`;
  }).join('');

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted)">No actions match.</div>`;
  }
}

async function selectAction(actionName) {
  const stickCfg = state.editorStick === 'right' ? state.config?.rightStick : state.config?.leftStick;
  if (!stickCfg || !state.editorControl) return;

  const jsInstance = stickCfg.jsInstance;
  const fullInput = fullInputForControl(state.editorControl, jsInstance);

  // Find action map for this action
  const action = state.scActions.find(a => a.name === actionName);
  const actionMap = getActionMapForCategory(action?.category ?? 'spaceship_general');

  // Remove any existing binding for this input
  state.bindings = state.bindings.filter(b => b.input !== fullInput);

  // Remove any existing binding for this action (conflict resolution)
  state.bindings = state.bindings.filter(b => b.action !== actionName);

  // Add new binding
  state.bindings.push({ action: actionName, actionMap, input: fullInput });

  state.dirty = true;
  updateFileBar();
  document.getElementById('btn-save').disabled = !state.loadedFile;
  document.getElementById('btn-save-as').disabled = false;

  closeModal();
  await renderDiagram();
  renderList();
  showToast(`Bound ${state.editorControl.name} → ${actionName}`, 'success');
}

async function clearBinding() {
  const stickCfg = state.editorStick === 'right' ? state.config?.rightStick : state.config?.leftStick;
  if (!stickCfg || !state.editorControl) return;

  const fullInput = fullInputForControl(state.editorControl, stickCfg.jsInstance);
  const hadBinding = state.bindings.some(b => b.input === fullInput);

  state.bindings = state.bindings.filter(b => b.input !== fullInput);

  if (hadBinding) {
    state.dirty = true;
    updateFileBar();
    showToast(`Cleared binding for ${state.editorControl.name}`, 'info');
  }

  closeModal();
  await renderDiagram();
  renderList();
}

function closeModal() {
  document.getElementById('binding-modal').classList.add('hidden');
  state.editorControl = null;
  state.editorStick = null;
}

/** Map SC action categories to their XML ActionMap names */
function getActionMapForCategory(category) {
  const map = {
    'Flight':           'spaceship_movement',
    'Strafe':           'spaceship_movement',
    'Systems':          'spaceship_systems',
    'Weapons':          'spaceship_weapons',
    'Targeting':        'spaceship_targeting',
    'Shields':          'spaceship_defensive',
    'Power':            'spaceship_power',
    'Navigation':       'spaceship_quantum',
    'Countermeasures':  'spaceship_defensive',
    'View':             'spaceship_view',
    'Mining':           'spaceship_mining',
    'Salvage':          'spaceship_salvage',
    'Misc':             'spaceship_general',
  };
  return map[category] ?? 'spaceship_general';
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
