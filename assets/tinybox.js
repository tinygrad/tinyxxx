// USD prices. Add Shopify IDs for the base systems and upgrades, not every
// possible combination. Each ID is the purchasable variant of that one item.
const ddr5Upgrade = { price: 8000, id: '67533223985370' }; // One 192 GB DDR5 upgrade.
const platforms = [
  { name: 'G4', ddr: 'DDR4', cpu: 'EPYC', pcie: 'PCIe 4', networking: '2× 1GbE + OCP3.0',
    base: { price: 7000, id: '50492208677082' }, memory: [
      { gb: 32, price: 0 },
      { gb: 128, price: 3000, id: '67533222641882' },
    ] },
  { name: 'G5', ddr: 'DDR5', cpu: 'GENOA', pcie: 'PCIe 5', networking: '2× 10GbE + OCP3.0 PCIe5',
    base: { price: 12000, id: '50492208611546' }, memory: [
      { gb: 32, price: 0 },
      { gb: 192, ...ddr5Upgrade },
    ] },
];
const storage = [
  { name: 'None', price: 0, detail: 'Boot drive only' },
  { name: '4 TB RAID', drives: '4x 1 TB drives', price: 2000, id: '67507609764058' },
  { name: '16 TB RAID', drives: '4x 4 TB drives', price: 6000, id: '67507609796826' },
];
// GPU RAM (GB) and memory bandwidth (GB/s) are per card; multiply by quantity for aggregate totals.
const r9700 = { price: 2500, id: '67533174571226', ram: 32, bandwidth: 640, vendor: 'amd', noise: '< 60 dB, GPU blowers are audible' }; // One R9700; quantities 4 or 6.
const gpus = [
  { name: 'None', price: 0, ram: 0, bandwidth: 0 },
  { name: '4× AMD 9070XT', price: 1000, id: '67507611271386', ram: 16, bandwidth: 640, quantity: 4, vendor: 'amd' },
  { name: '4× AMD R9700', ...r9700, quantity: 4 },
  { name: '6× AMD R9700', ...r9700, quantity: 6, note: 'limited to 225W' },
];
const presets = [
  { name: 'tinybox base', platform: 0, memory: 0, storage: 0, gpu: 0 },
  { name: 'tinybox red flash', vendor: 'amd', platform: 0, memory: 0, storage: 0, gpu: gpus.findIndex(gpu => gpu.quantity === 6) },
  { name: 'tinybox workstation', platform: 1, memory: 1, storage: 1, gpu: 0 },
];
const shop = 'https://tinycorp.myshopify.com';
const money = value => '$' + value.toLocaleString('en-US');
const cost = item => item.price * (item.quantity || 1);
const form = document.querySelector('#configurator');
const checkout = document.querySelector('#checkout');
const backToModels = document.querySelector('#back-to-models');

function choices(name, options, selectedIndex = 0) {
  return options.map((option, index) => `
    <label class="choice"${option.vendor ? ` data-vendor="${option.vendor}"` : ''}>
      <input type="radio" name="${name}" value="${index}" ${index === selectedIndex ? 'checked' : ''}>
      <span class="choice-content">
        <span>
          <span class="choice-title">${option.label}</span>
          ${option.description ? `<span class="choice-description">${option.description}</span>` : ''}
        </span>
        <span class="choice-price">${option.detail}</span>
      </span>
    </label>
  `).join('');
}

function fieldset(name, title, step) {
  return `<fieldset id="${name}-fieldset">
    <legend>${step ? `<span class="step">0${step}</span>` : ''}${title}</legend>
    <div id="${name}-choices" class="choices ${name}"></div>
  </fieldset>`;
}

document.querySelector('#preset-options').innerHTML = fieldset('preset', 'Choose your tinybox');
document.querySelector('#preset-choices').innerHTML = choices('preset', presets.map(preset => {
  const platform = platforms[preset.platform];
  const memory = platform.memory[preset.memory];
  const extra = storage[preset.storage];
  const gpu = gpus[preset.gpu];
  return {
    label: `<span>${preset.name.replace(/\bred\b/, '<span class="preset-red">red</span>')}</span>`,
    vendor: preset.vendor,
    description: `${platform.name} · ${memory.gb} GB ${platform.ddr}${extra.price ? ` · ${extra.name}` : ''}<br>${gpu.quantity ? `${gpu.name}<br>${gpu.ram * gpu.quantity} GB GPU RAM · ${(gpu.bandwidth * gpu.quantity).toLocaleString('en-US')} GB/s` : 'Bring your own GPUs · Fits up to 4'}`,
    detail: money([platform.base, memory, extra, gpu].reduce((sum, item) => sum + cost(item), 0)),
  };
})) + `
  <button id="customize-own" class="choice" type="button" aria-controls="options">
    <span class="choice-content">
      <span class="choice-title">Customize my own <span aria-hidden="true">→</span></span>
    </span>
  </button>
`;

document.querySelector('#options').innerHTML = [
  fieldset('platform', 'Platform', 1),
  fieldset('memory', 'Memory', 2),
  fieldset('storage', 'Extra storage', 3),
  fieldset('gpu', 'GPUs', 4),
].join('');

document.querySelector('#platform-choices').innerHTML = choices('platform', platforms.map(platform => ({
  label: platform.name,
  detail: `${platform.ddr}<br>${platform.cpu}<br>${platform.pcie}<br>${money(platform.base.price)} base`,
})));
for (const [name, options] of [['storage', storage], ['gpu', gpus]]) {
  document.querySelector(`#${name}-choices`).innerHTML = choices(name, options.map(option => ({
    label: option.name,
    vendor: option.vendor,
    detail: option.price ? '+' + money(cost(option)) : (option.detail || 'No extra cost'),
  })));
}

const selected = name => Number(form.elements.namedItem(name).value);
function renderMemory(selectedIndex = 0) {
  const platform = platforms[selected('platform')];
  document.querySelector('#memory-choices').innerHTML = choices('memory', platform.memory.map(memory => ({
    label: `${memory.gb} GB`,
    detail: memory.price ? '+' + money(cost(memory)) : 'Included',
  })), selectedIndex);
}

function compatible(extra, gpu) {
  return !extra.price || gpu.quantity !== 6;
}
function renderAvailability() {
  const extra = storage[selected('storage')];
  const gpu = gpus[selected('gpu')];
  for (const input of form.querySelectorAll('input[name="storage"]')) {
    input.disabled = !compatible(storage[Number(input.value)], gpu);
  }
  for (const input of form.querySelectorAll('input[name="gpu"]')) {
    input.disabled = !compatible(extra, gpus[Number(input.value)]);
  }
}
function applyPreset(index) {
  const preset = presets[index];
  form.elements.namedItem('platform').value = String(preset.platform);
  renderMemory(preset.memory);
  form.elements.namedItem('storage').value = String(preset.storage);
  form.elements.namedItem('gpu').value = String(preset.gpu);
  update();
  renderGallery();
}

function syncPreset() {
  const index = presets.findIndex(preset => ['platform', 'memory', 'storage', 'gpu'].every(name => preset[name] === selected(name)));
  for (const input of form.querySelectorAll('input[name="preset"]')) {
    input.checked = Number(input.value) === index;
  }
}

function selection() {
  const platform = platforms[selected('platform')];
  const memory = platform.memory[selected('memory')];
  const base = platform.base;
  const extra = storage[selected('storage')];
  const gpu = gpus[selected('gpu')];
  const valid = compatible(extra, gpu);
  const items = [base, memory, extra, gpu].filter(item => item.price > 0);
  return { platform, base, memory, extra, gpu, items, valid, ready: valid && base.price != null && Boolean(base.id) && items.every(item => item.id && !item.outOfStock) };
}

function update() {
  renderAvailability();
  syncPreset();
  const { platform, base, memory, extra, gpu, items, valid, ready } = selection();
  const priced = base.price != null;
  document.querySelector('#total').value = priced ? money(items.reduce((sum, item) => sum + cost(item), 0)) : '—';
  document.querySelector('.currency').hidden = !priced;
  const preset = presets.find(preset => ['platform', 'memory', 'storage', 'gpu'].every(name => preset[name] === selected(name)));
  document.querySelector('#order-model').textContent = preset ? preset.name : 'Your tinybox';
  document.querySelector('#lead-time').textContent = gpu.outOfStock ? 'Out of stock.' : 'Ships in 1–8 weeks.';
  const specs = {
    platform: `${platform.name} / ${platform.pcie}`,
    cpu: `32 core ${platform.cpu}, water cooled`,
    memory: `${memory.gb} GB ${platform.ddr}`,
    storage: '1 TB boot SSD' + (extra.price ? ` + ${extra.drives}` : ''),
    networking: platform.networking || 'Not specified',
    gpu: gpu.name,
    'gpu-ram': `${gpu.ram * (gpu.quantity || 1)} GB, ${(gpu.bandwidth * (gpu.quantity || 1)).toLocaleString('en-US')} GB/s`,
    power: '1700W PSU, 100V~240V',
    noise: gpu.noise || '< 50 dB, low speed Noctua fans',
    board: 'Server grade with BMC',
    slots: `Up to ${Math.max(4, gpu.quantity || 0)} GPUs, full-fabric PCIe`,
    size: '42 lbs, 12″W × 19¼″H × 18″D',
  };
  for (const [name, value] of Object.entries(specs)) {
    document.querySelector(`#spec-${name}`).textContent = value;
  }
  if (gpu.note) {
    const note = document.createElement('span');
    note.className = 'spec-note';
    note.textContent = ` (${gpu.note})`;
    document.querySelector('#spec-gpu').append(note);
  }
  if (gpu.noise) {
    const warning = document.createElement('span');
    warning.className = 'noise-warning';
    warning.textContent = gpu.noise.split(',')[0];
    document.querySelector('#spec-noise').replaceChildren(warning, gpu.noise.slice(warning.textContent.length));
  }
  checkout.disabled = !ready;
  const note = document.querySelector('#checkout-note');
  note.hidden = ready;
  note.textContent = gpu.outOfStock ? 'Selected GPUs are out of stock.' : !valid ? '6× R9700 GPUs cannot be combined with extra RAID storage.' : 'Checkout not connected.';
}

function renderMode(customizing) {
  const scrollTop = window.scrollY;
  document.querySelector('#options').hidden = !customizing;
  document.querySelector('#presets').hidden = customizing;
  backToModels.hidden = !customizing;
  // Keep browser scroll anchoring from moving the page when the form changes height.
  window.scrollTo(0, scrollTop);
}
function navigateMode(customizing) {
  if (!customizing) {
    const matching = presets.findIndex(preset => ['platform', 'memory', 'storage', 'gpu'].every(name => preset[name] === selected(name)));
    applyPreset(matching >= 0 ? matching : presets.findIndex(preset => preset.platform === selected('platform')));
  }
  renderMode(customizing);
  document.querySelector(customizing ? '#platform-choices input:checked' : '#preset-choices input:checked')
    .focus({ preventScroll: true });
}
window.history.scrollRestoration = 'manual';
backToModels.addEventListener('click', () => window.history.back());
document.querySelector('#customize-own').addEventListener('click', () => {
  window.history.pushState({ ...window.history.state, tinyboxMode: 'customize' }, '');
  navigateMode(true);
});
window.addEventListener('popstate', event => {
  navigateMode(event.state?.tinyboxMode === 'customize');
});

form.addEventListener('change', event => {
  if (event.target.name === 'preset') {
    applyPreset(selected('preset'));
    return;
  }
  if (event.target.name === 'platform') {
    renderMemory(selected('memory'));
    renderGallery();
  }
  update();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const { items, ready } = selection();
  if (ready) {
    const cart = items.map(item => `${item.id}:${item.quantity || 1}`).join(',');
    window.location.assign(`${shop}/cart/${cart}`);
  }
});
let currentView = 'front';
const photos = document.querySelectorAll('.photo-stage img');
const viewButtons = document.querySelectorAll('.views button');
function renderGallery() {
  const platform = platforms[selected('platform')].name;
  const matches = item => !item.dataset.platform || item.dataset.platform === platform;
  if (![...viewButtons].some(button => matches(button) && button.dataset.view === currentView)) {
    currentView = 'front';
  }
  for (const photo of photos) {
    photo.hidden = !matches(photo) || photo.dataset.view !== currentView;
  }
  for (const button of viewButtons) {
    button.hidden = !matches(button);
    const active = !button.hidden && button.dataset.view === currentView;
    button.setAttribute('aria-pressed', String(active));
    if (active) document.querySelector('#photo-caption').textContent = button.getAttribute('aria-label');
  }
}
viewButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentView = button.dataset.view;
    renderGallery();
  });
});
applyPreset(presets.findIndex(preset => preset.name === 'tinybox red flash'));
renderMode(false);
form.hidden = false;
if (window.history.state?.tinyboxMode === 'customize') {
  // Refresh returns to the existing models entry, rather than creating a duplicate.
  window.history.back();
} else {
  window.history.replaceState({ ...window.history.state, tinyboxMode: 'models' }, '');
}
