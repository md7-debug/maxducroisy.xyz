(async () => {
  const space = document.querySelector('.personal-space');
  const canvas = document.querySelector('.orb-canvas');
  const grid = document.querySelector('#thread-grid');
  const heading = document.querySelector('#thread-heading');
  const status = document.querySelector('.orb-status');
  const browseButton = document.querySelector('.browse-button');
  const browseLabel = document.querySelector('.browse-label');
  const browseCount = document.querySelector('.browse-count');
  const archiveDialog = document.querySelector('.archive-dialog');
  const archiveList = document.querySelector('.archive-list');
  const archiveClose = document.querySelector('.archive-close');
  const archiveFilters = document.querySelector('.archive-filters');
  const archiveSearch = document.querySelector('.archive-search input');
  const archiveSummary = document.querySelector('.archive-summary');
  const archiveResults = document.querySelector('.archive-results');
  const archiveMore = document.querySelector('.archive-more');
  const triggers = [...document.querySelectorAll('.thread-trigger')];
  const modeButtons = [...document.querySelectorAll('.mode-button')];
  const navigationButtons = [...document.querySelectorAll('.thread-arrow')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ambientToggle = document.querySelector('.ambient-toggle');
  const ambientText = document.querySelector('.ambient-text');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function setAmbient(mode, persist = false) {
    const isNight = mode === 'night';
    document.documentElement.dataset.ambient = isNight ? 'night' : 'day';
    ambientToggle?.setAttribute('aria-pressed', String(isNight));
    ambientToggle?.setAttribute('aria-label', `Switch to ${isNight ? 'day' : 'night'} theme`);
    if (ambientText) ambientText.textContent = isNight ? 'Day' : 'Night';
    if (themeColor) themeColor.content = isNight ? '#101211' : '#f3f1ec';
    if (persist) {
      try {
        localStorage.setItem('max-ambient', isNight ? 'night' : 'day');
      } catch {
        // The theme still works when storage is unavailable.
      }
    }
  }

  setAmbient(document.documentElement.dataset.ambient === 'night' ? 'night' : 'day');
  ambientToggle?.addEventListener('click', () => {
    const nextMode = document.documentElement.dataset.ambient === 'night' ? 'day' : 'night';
    setAmbient(nextMode, true);
  });

  function initDynamicFavicon() {
    const favicon = document.querySelector('#site-favicon');
    if (!favicon || reducedMotion.matches) return;

    const faviconCanvas = document.createElement('canvas');
    const context = faviconCanvas.getContext('2d');
    if (!context) return;

    const size = 64;
    const pointCount = 38;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const points = Array.from({ length: pointCount }, (_, index) => {
      const y = 1 - (index / (pointCount - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = goldenAngle * index;
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    });

    faviconCanvas.width = size;
    faviconCanvas.height = size;
    let rotation = 0;

    function renderFavicon() {
      if (document.hidden) return;
      rotation += 0.16;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      const rotated = points.map((point, index) => ({
        index,
        x: point.x * cosine + point.z * sine,
        y: point.y,
        z: -point.x * sine + point.z * cosine,
      })).sort((a, b) => a.z - b.z);

      context.clearRect(0, 0, size, size);
      context.strokeStyle = 'rgba(255, 121, 88, 0.72)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.ellipse(32, 32, 24, 9, rotation * 0.45, 0, Math.PI * 2);
      context.stroke();

      rotated.forEach(point => {
        const perspective = 1 + point.z * 0.14;
        const x = 32 + point.x * 22 * perspective;
        const y = 32 + point.y * 22 * perspective;
        const radius = 1.8 + (point.z + 1) * 0.85;
        const lightness = 56 + (point.z + 1) * 12;
        context.globalAlpha = 0.58 + (point.z + 1) * 0.2;
        context.fillStyle = `hsl(12 100% ${lightness}%)`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      });

      context.globalAlpha = 1;
      favicon.href = faviconCanvas.toDataURL('image/png');
    }

    renderFavicon();
    window.setInterval(renderFavicon, 160);
    document.addEventListener('visibilitychange', renderFavicon);
  }

  initDynamicFavicon();

  if (!space || !canvas || !grid || !heading || !status) return;

  async function loadCatalogue() {
    try {
      const response = await fetch('content.json');
      if (!response.ok) throw new Error(`Content request failed with ${response.status}`);
      const content = await response.json();
      return Array.isArray(content.entries) ? content.entries : [];
    } catch (error) {
      console.warn('Browse content is unavailable.', error);
      return [];
    }
  }

  const catalogue = await loadCatalogue();

  const fragments = {
    control: {
      label: 'People staying in control',
      items: [
        {
          title: 'ThryveLoop',
          meta: 'Project',
          description: 'A private decision practice for difficult or uncertain moments.',
          thread: 'thryveloop',
        },
        {
          title: 'Cura Reader',
          meta: 'Open source',
          description: 'A quiet bilingual reading practice for philosophy, kept locally.',
          href: 'https://curareader.vercel.app',
          link: 'Open Cura Reader',
        },
        {
          title: 'Interest',
          meta: '',
          description: 'How to keep people in control when agents work across their tools and documents.',
        },
      ],
    },
    thryveloop: {
      label: 'ThryveLoop',
      items: [
        {
          title: 'ThryveLoop',
          meta: 'Decision practice',
          description: 'A private decision practice for difficult or uncertain moments.',
          href: 'https://thryveloop.com',
          link: 'Visit ThryveLoop',
        },
        {
          title: 'Observe, test, reflect',
          meta: 'In real life',
          description: 'Observe what is happening, test small changes in real life, reflect on the results, and decide what to carry forward.',
        },
        {
          title: 'Agentic coach',
          meta: 'When invited',
          description: 'An agentic coach can help when invited, while you control its context and every decision.',
        },
      ],
    },
    london: {
      label: 'London',
      items: [
        {
          title: 'London',
          meta: 'Personal',
          description: 'I live in London, where I work on TraDuotech and my own projects.',
        },
        {
          title: 'TraDuotech',
          meta: 'Work',
          description: 'From London, I work on AI agents for procurement at TraDuotech.',
          href: 'https://traduotech.com',
          link: 'Visit TraDuotech',
        },
        {
          title: 'Conversation',
          meta: '',
          description: 'If our interests overlap, you can book a conversation with me.',
          href: 'https://cal.com/mducroisy',
          link: 'Find a time',
        },
      ],
    },
    agents: {
      label: 'AI agents',
      items: [
        {
          title: 'TraDuotech',
          meta: 'Current work',
          description: 'At TraDuotech, I work on AI agents for real procurement workflows.',
          href: 'https://traduotech.com',
          link: 'Visit TraDuotech',
        },
        {
          title: 'Interest',
          meta: '',
          description: 'Simpler ways to give agents work and review what they do.',
        },
        {
          title: 'Interest',
          meta: '',
          description: 'Agents that work across real tools, documents and workflows while people stay in control.',
        },
      ],
    },
    procurement: {
      label: 'Procurement',
      items: [
        {
          title: 'TraDuotech',
          meta: 'Current work',
          description: 'I work on AI agents for procurement, from the workflow and controls through testing and rollout.',
          href: 'https://traduotech.com',
          link: 'Visit TraDuotech',
        },
        {
          title: 'In progress',
          meta: 'Agent product',
          description: 'I’m working on AI agents that reduce manual procurement work and help teams move faster, while keeping people in charge of decisions.',
          href: 'https://cal.com/mducroisy',
          link: 'Request a demo',
        },
        {
          title: 'Value',
          meta: '',
          description: 'More capacity for suppliers, exceptions and work that needs judgement.',
        },
      ],
    },
    traduotech: {
      label: 'TraDuotech',
      items: [
        {
          title: 'TraDuotech',
          meta: 'Now',
          description: 'I work on bringing AI agents to procurement.',
          href: 'https://traduotech.com',
          link: 'Visit TraDuotech',
        },
        {
          title: 'Real workflows',
          meta: 'Principle',
          description: 'Useful agents have to fit the tools, documents and decisions people already work with.',
        },
        {
          title: 'A practical start',
          meta: '',
          description: 'I can show you what is in progress and discuss where it may help your team.',
          href: 'https://cal.com/mducroisy',
          link: 'Request a demo',
        },
      ],
    },
    engineering: {
      label: 'Industrial engineering',
      items: [
        {
          title: 'Systems engineering',
          meta: 'Background',
          description: 'Industrial and systems engineering, with a focus on supply chain management.',
        },
        {
          title: 'From France to London',
          meta: 'Personal',
          description: 'Since studying engineering, I’ve worked across procurement strategy, operations and product implementation in the UK.',
        },
        {
          title: 'French and English',
          meta: 'Languages',
          description: 'I work, read and speak in both languages.',
        },
      ],
    },
    supplychain: {
      label: 'Procurement and supply chain',
      items: [
        {
          title: 'Connected systems',
          meta: 'Background',
          description: 'Experience across sourcing, suppliers, materials, decisions and the exceptions around them.',
        },
        {
          title: 'Operational trade-offs',
          meta: 'Experience',
          description: 'I’m used to balancing policy, timing and risk with what teams can actually do.',
        },
        {
          title: 'Across the workflow',
          meta: 'Practice',
          description: 'From sourcing and buying through supplier risk, obligations and payment.',
        },
      ],
    },
    implementation: {
      label: 'Product implementation',
      items: [
        {
          title: 'Discover',
          meta: 'Practice',
          description: 'Start with how people do the work and where it stalls.',
        },
        {
          title: 'Test',
          meta: 'Practice',
          description: 'Test the boundaries, evidence, exceptions and approvals before rollout.',
        },
        {
          title: 'Adopt',
          meta: 'Practice',
          description: 'Keep controls clear from testing through rollout, training and adoption.',
        },
      ],
    },
    useful: {
      label: 'Useful in real work',
      items: [
        {
          title: 'Practical',
          meta: 'Interest',
          description: 'Capable AI should be affordable and useful enough for everyday work.',
        },
        {
          title: 'Connected',
          meta: 'Interest',
          description: 'Agents should work across the real tools, documents and workflows around a task.',
        },
        {
          title: 'Reviewable',
          meta: 'Interest',
          description: 'People need simple ways to give agents work and review what they do.',
        },
      ],
    },
  };

  function catalogueItems(kind) {
    return catalogue
      .filter(entry => entry.kind === kind)
      .map(entry => ({
        title: entry.title,
        meta: [entry.source, entry.readingTime].filter(Boolean).join(' · '),
        description: entry.description,
        href: entry.href,
        link: entry.link,
      }));
  }

  const writingItems = catalogueItems('writing');
  const noteItems = catalogueItems('note');
  const videoItems = catalogueItems('video');

  const fallbackNotes = [
    {
      title: 'Giving agents work',
      meta: 'Interest',
      description: 'Simpler ways to give agents a task and review what they do.',
    },
    {
      title: 'Across real tools',
      meta: 'Interest',
      description: 'Agents that can work across documents and workflows while people stay in control.',
    },
    {
      title: 'Everyday use',
      meta: 'Interest',
      description: 'Making capable AI practical and affordable enough for everyday work.',
    },
  ];

  const fallbackVideo = [{
    title: 'Video',
    meta: 'Soon',
    description: 'I’ll add talks and working demos here when I publish them.',
  }];

  const modeContent = {
    projects: fragments.control,
    notes: {
      label: 'Interests and notes',
      archiveKind: noteItems.length ? 'note' : null,
      items: noteItems.length ? noteItems : fallbackNotes,
    },
    writing: {
      label: 'Writing',
      variant: 'writing',
      archiveKind: 'writing',
      items: writingItems.length ? writingItems : [{
        title: 'Writing',
        meta: '',
        description: 'Published articles will appear here.',
      }],
    },
    video: {
      label: 'Video',
      archiveKind: videoItems.length ? 'video' : null,
      items: videoItems.length ? videoItems : fallbackVideo,
    },
  };

  let activeThread = 'control';
  let activeContent = fragments.control;
  let contentOffset = 0;
  let renderTimer = 0;
  let updateOrbTargets = () => {};
  let archiveHistoryEntry = false;
  let closingFromHistory = false;

  const iconMarkup = '<span class="external-mark" aria-hidden="true">↗</span>';

  function updateLocation(changes, mode = 'push') {
    const url = new URL(window.location.href);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    url.hash = 'top';
    try {
      window.history[`${mode}State`]({}, '', url);
    } catch {
      // Local file previews can reject History API URL changes.
    }
  }

  function fragmentMarkup(item, index) {
    const meta = item.meta ? `<span>${item.meta}</span>` : '';
    const isActionLink = item.link === 'Request a demo' || item.link === 'Find a time';
    const title = item.thread
      ? `<button class="fragment-trigger" type="button" data-fragment-thread="${item.thread}">${item.title}</button>`
      : item.href && !isActionLink
        ? `<a href="${item.href}">${item.title}</a>`
        : item.title;
    const link = item.href && isActionLink
      ? `<a class="thread-link" href="${item.href}">${item.link} ${iconMarkup}</a>`
      : '';

    return `
      <article class="thread-item">
        <span class="orb-slot" data-orb-slot="thread-${index}" aria-hidden="true"></span>
        <p class="thread-meta">${title} ${meta}</p>
        <p class="thread-description">${item.description}</p>
        ${link}
      </article>`;
  }

  function setContent(content, announcement, resetOffset = true) {
    window.clearTimeout(renderTimer);
    activeContent = content;
    if (resetOffset) contentOffset = 0;
    grid.classList.add('is-changing');

    renderTimer = window.setTimeout(() => {
      const visibleItems = content.items.length > 3
        ? Array.from({ length: 3 }, (_, index) => content.items[(contentOffset + index) % content.items.length])
        : content.items;
      heading.textContent = content.label;
      grid.dataset.count = String(visibleItems.length);
      grid.dataset.variant = content.variant || 'default';
      grid.innerHTML = visibleItems.map(fragmentMarkup).join('');
      grid.classList.remove('is-changing');
      if (browseLabel) {
        const filterLabel = content.archiveKind === 'note' ? 'notes' : content.archiveKind;
        browseLabel.textContent = filterLabel ? `Browse ${filterLabel}` : 'Browse all';
      }
      if (browseCount) {
        const count = content.archiveKind
          ? catalogue.filter(entry => entry.kind === content.archiveKind).length
          : catalogue.length;
        browseCount.textContent = String(count).padStart(2, '0');
      }
      status.textContent = announcement;
      updateOrbTargets();
    }, reducedMotion.matches ? 0 : 150);
  }

  function selectThread(trigger, historyMode = 'push') {
    const key = trigger.dataset.thread;
    if (!fragments[key]) return;

    activeThread = key;
    triggers.forEach(item => {
      const isActive = item === trigger;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });

    modeButtons.forEach(button => {
      button.classList.remove('is-active');
      button.setAttribute('aria-selected', 'false');
    });

    setContent(fragments[key], `${fragments[key].label} thread opened.`);
    if (historyMode !== 'none') {
      updateLocation({ thread: key, view: null, browse: null }, historyMode);
    }
    updateConnection(trigger);
    window.requestAnimationFrame(updateOrbTargets);
  }

  function selectMode(button, historyMode = 'push') {
    const mode = button.dataset.mode;
    if (!modeContent[mode]) return;

    modeButtons.forEach(item => {
      const isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
    triggers.forEach(item => {
      item.classList.remove('is-active');
      item.setAttribute('aria-pressed', 'false');
    });

    setContent(modeContent[mode], `${modeContent[mode].label} opened.`);
    if (historyMode !== 'none') {
      updateLocation({ view: mode, thread: null, browse: null }, historyMode);
    }
    window.requestAnimationFrame(updateOrbTargets);
  }

  function updateConnection(trigger = document.querySelector('.thread-trigger.is-active')) {
    const connection = document.querySelector('.thread-connection');
    const stage = document.querySelector('.thread-stage');
    if (!connection || !stage || !trigger || window.innerWidth < 768) return;

    const spaceBox = space.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const top = triggerBox.bottom - spaceBox.top - 2;
    const left = triggerBox.right - spaceBox.left + 12;
    const stageTop = stageBox.top - spaceBox.top;
    const turnX = Math.max(left + 90, spaceBox.width * 0.54);

    connection.style.top = `${top}px`;
    connection.style.left = `${left}px`;
    connection.style.width = `${Math.max(86, turnX - left)}px`;
    connection.style.height = `${Math.max(32, stageTop - top + 1)}px`;
  }

  function cycleThread(direction) {
    if (activeContent.items.length > 3) {
      const delta = direction === 'next' ? 1 : -1;
      contentOffset = (contentOffset + delta + activeContent.items.length) % activeContent.items.length;
      setContent(activeContent, `${activeContent.label} moved to the next set of articles.`, false);
      return;
    }

    const index = triggers.findIndex(trigger => trigger.dataset.thread === activeThread);
    const delta = direction === 'next' ? 1 : -1;
    const nextIndex = (index + delta + triggers.length) % triggers.length;
    const nextTrigger = triggers[nextIndex];
    selectThread(nextTrigger);
    nextTrigger.focus({ preventScroll: true });
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => selectThread(trigger));
  });

  modeButtons.forEach(button => {
    button.addEventListener('click', () => selectMode(button));
    button.addEventListener('keydown', event => {
      const currentIndex = modeButtons.indexOf(button);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % modeButtons.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + modeButtons.length) % modeButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = modeButtons.length - 1;
      if (nextIndex === currentIndex) return;
      event.preventDefault();
      modeButtons[nextIndex].focus();
      selectMode(modeButtons[nextIndex]);
    });
  });

  grid.addEventListener('click', event => {
    const trigger = event.target.closest('.fragment-trigger');
    if (!trigger || !grid.contains(trigger)) return;
    const thread = fragments[trigger.dataset.fragmentThread];
    if (!thread) return;
    setContent(thread, `${thread.label} thread opened.`);
  });

  navigationButtons.forEach(button => {
    button.addEventListener('click', () => cycleThread(button.dataset.direction));
  });

  function formatDate(value) {
    if (!value) return '';
    if (/^\d{4}$/.test(value)) return value;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function archiveDateMarkup(entry) {
    if (!entry.date) return '';
    if (/^\d{4}$/.test(entry.date)) return `<span>${escapeHTML(entry.date)}</span>`;
    const date = new Date(`${entry.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return `<span>${escapeHTML(entry.date)}</span>`;
    const dayMonth = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(date);
    const year = new Intl.DateTimeFormat('en-GB', { year: 'numeric' }).format(date);
    return `<span>${escapeHTML(dayMonth)}</span><span>${escapeHTML(year)}</span>`;
  }

  function escapeHTML(value = '') {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(value).replace(/[&<>"']/g, character => entities[character]);
  }

  function archiveItemMarkup(entry) {
    const target = entry.href ? ` href="${escapeHTML(entry.href)}"` : '';
    const tag = entry.href ? 'a' : 'div';
    const dateAction = entry.dateKind === 'updated' ? 'Updated' : 'Published';
    const dateTitle = entry.date ? `${dateAction} ${formatDate(entry.date)}` : '';
    return `
      <${tag} class="archive-item"${target}>
        <time datetime="${escapeHTML(entry.date)}" title="${escapeHTML(dateTitle)}">${archiveDateMarkup(entry)}</time>
        <span class="archive-type">${escapeHTML(entry.type)}</span>
        <span class="archive-classification">${escapeHTML(entry.classification)}</span>
        <span class="archive-title">${escapeHTML(entry.title)}</span>
        ${entry.href ? '<span class="external-mark" aria-hidden="true">↗</span>' : ''}
      </${tag}>`;
  }

  const archiveKindLabels = {
    writing: 'Writing',
    project: 'Projects',
    video: 'Video',
    note: 'Notes',
  };
  const archiveKindOrder = ['writing', 'project', 'video', 'note'];
  let archiveFilter = 'all';
  let archiveQuery = '';
  let archiveVisibleCount = 0;

  function archivePageSize() {
    return window.matchMedia('(max-width: 47.99rem)').matches ? 8 : 12;
  }

  function availableArchiveKinds() {
    const presentKinds = [...new Set(catalogue.map(entry => entry.kind).filter(Boolean))];
    return presentKinds.sort((first, second) => {
      const firstIndex = archiveKindOrder.indexOf(first);
      const secondIndex = archiveKindOrder.indexOf(second);
      return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
    });
  }

  function renderArchiveFilters() {
    if (!archiveFilters) return;
    const filters = ['all', ...availableArchiveKinds()];
    archiveFilters.innerHTML = filters.map(filter => {
      const count = filter === 'all'
        ? catalogue.length
        : catalogue.filter(entry => entry.kind === filter).length;
      const fallbackLabel = filter.charAt(0).toUpperCase() + filter.slice(1);
      const label = filter === 'all' ? 'All' : archiveKindLabels[filter] || fallbackLabel;
      return `<button class="archive-filter" type="button" data-archive-filter="${escapeHTML(filter)}" aria-pressed="false"><span>${escapeHTML(label)}</span><small>${count}</small></button>`;
    }).join('');
  }

  function filteredArchiveEntries() {
    const query = archiveQuery.trim().toLocaleLowerCase();
    return catalogue.filter(entry => {
      if (archiveFilter !== 'all' && entry.kind !== archiveFilter) return false;
      if (!query) return true;
      const searchable = [
        entry.title,
        entry.description,
        entry.classification,
        entry.type,
        entry.source,
        entry.date,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    }).sort((first, second) => (second.date || '').localeCompare(first.date || ''));
  }

  function renderArchive({ reset = false } = {}) {
    if (!archiveList) return;
    if (reset) archiveVisibleCount = archivePageSize();
    const entries = filteredArchiveEntries();
    const visibleEntries = entries.slice(0, archiveVisibleCount);
    archiveList.innerHTML = visibleEntries.length
      ? visibleEntries.map(archiveItemMarkup).join('')
      : '<p class="archive-empty">Nothing published here yet.</p>';

    archiveFilters?.querySelectorAll('.archive-filter').forEach(button => {
      const isActive = button.dataset.archiveFilter === archiveFilter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    if (archiveSummary) {
      const noun = entries.length === 1 ? 'item' : 'items';
      archiveSummary.textContent = `${entries.length} ${noun}`;
    }

    if (archiveMore) {
      const remaining = Math.max(0, entries.length - visibleEntries.length);
      archiveMore.hidden = remaining === 0;
      archiveMore.textContent = remaining ? `Show ${Math.min(archivePageSize(), remaining)} more · ${remaining} remaining` : '';
    }

    if (reset && archiveResults) archiveResults.scrollTop = 0;
  }

  function openArchive(filter = 'all', historyMode = 'push') {
    archiveFilter = filter;
    archiveQuery = '';
    if (archiveSearch) archiveSearch.value = '';
    renderArchiveFilters();
    renderArchive({ reset: true });
    if (archiveDialog && !archiveDialog.open) archiveDialog.showModal();
    document.body.classList.add('archive-open');
    if (historyMode !== 'none') {
      updateLocation({ browse: archiveFilter }, historyMode);
      archiveHistoryEntry = historyMode === 'push';
    }
  }

  browseButton?.addEventListener('click', () => {
    openArchive(activeContent.archiveKind || 'all');
  });

  archiveClose?.addEventListener('click', () => archiveDialog?.close());
  archiveFilters?.addEventListener('click', event => {
    const button = event.target.closest('.archive-filter');
    if (!button || !archiveFilters.contains(button)) return;
    archiveFilter = button.dataset.archiveFilter;
    renderArchive({ reset: true });
    updateLocation({ browse: archiveFilter }, 'replace');
  });
  archiveSearch?.addEventListener('input', () => {
    archiveQuery = archiveSearch.value;
    renderArchive({ reset: true });
  });
  archiveMore?.addEventListener('click', () => {
    archiveVisibleCount += archivePageSize();
    renderArchive();
  });
  archiveDialog?.addEventListener('click', event => {
    if (event.target === archiveDialog) archiveDialog.close();
  });
  archiveDialog?.addEventListener('close', () => {
    document.body.classList.remove('archive-open');
    if (closingFromHistory) {
      closingFromHistory = false;
      archiveHistoryEntry = false;
      return;
    }
    const hasBrowseState = new URL(window.location.href).searchParams.has('browse');
    if (!hasBrowseState) return;
    if (archiveHistoryEntry) {
      window.history.back();
    } else {
      updateLocation({ browse: null }, 'replace');
    }
  });

  function applyLocationState() {
    const params = new URL(window.location.href).searchParams;
    const threadKey = params.get('thread');
    const viewKey = params.get('view');
    const browseKey = params.get('browse');
    const threadTrigger = triggers.find(trigger => trigger.dataset.thread === threadKey);
    const modeButton = modeButtons.find(button => button.dataset.mode === viewKey);

    if (threadTrigger) {
      selectThread(threadTrigger, 'none');
    } else if (modeButton) {
      selectMode(modeButton, 'none');
    } else {
      const defaultTrigger = triggers.find(trigger => trigger.dataset.thread === 'control');
      if (defaultTrigger) selectThread(defaultTrigger, 'none');
    }

    if (browseKey) {
      openArchive(browseKey, 'none');
      archiveHistoryEntry = false;
    } else if (archiveDialog?.open) {
      closingFromHistory = true;
      archiveDialog.close();
    }
  }

  window.addEventListener('popstate', applyLocationState);

  window.addEventListener('resize', () => updateConnection());
  updateConnection();

  function initOrbs() {
    if (!window.ThinkingOrbs) {
      canvas.hidden = true;
      space.classList.add('orbs-unavailable');
      return;
    }

    const compactOrbs = window.matchMedia('(max-width: 47.99rem)').matches;
    const entries = [
      { name: 'active', state: 'working', size: compactOrbs ? 40 : 64, color: [255, 142, 111], accent: [255, 239, 230] },
      { name: 'thread-0', state: 'working', size: compactOrbs ? 46 : 52, color: [255, 142, 111], accent: [255, 239, 230] },
      { name: 'thread-1', state: 'searching', size: compactOrbs ? 46 : 54, color: [238, 234, 224], accent: [255, 142, 111] },
      { name: 'thread-2', state: 'connecting', size: compactOrbs ? 48 : 58, color: [220, 223, 214], accent: [255, 142, 111] },
      { name: 'track-0', state: 'searching', size: compactOrbs ? 20 : 24, color: [255, 142, 111], accent: [255, 239, 230] },
      { name: 'track-1', state: 'working', size: compactOrbs ? 20 : 24, color: [236, 232, 223], accent: [255, 142, 111] },
      { name: 'corner', state: 'searching', size: compactOrbs ? 38 : 42, color: [238, 234, 224], accent: [255, 142, 111] },
    ];
    const field = window.ThinkingOrbs.createField({ canvas, host: space, entries, reducedMotion });
    let hoverTrigger = null;

    function toCanvasPosition(rect, xOffset = 0, yOffset = 0) {
      const host = space.getBoundingClientRect();
      return {
        x: rect.left - host.left + rect.width / 2 + xOffset,
        y: rect.top - host.top + rect.height / 2 + yOffset,
      };
    }

    function updateTargets() {
      const trigger = hoverTrigger
        || document.querySelector('.thread-trigger.is-active')
        || document.querySelector('.mode-button.is-active');
      if (trigger && !(compactOrbs && trigger.classList.contains('mode-button'))) {
        const activeOffset = compactOrbs ? 20 : 32;
        const activePosition = toCanvasPosition(trigger.getBoundingClientRect(), trigger.offsetWidth / 2 + activeOffset);
        field.setTarget('active', activePosition.x, activePosition.y);
      } else {
        field.setTarget('active', 0, 0, false);
      }

      entries.slice(1).forEach(entry => {
        if (compactOrbs && entry.name.startsWith('track-')) {
          field.setTarget(entry.name, 0, 0, false);
          return;
        }
        const slot = space.querySelector(`[data-orb-slot="${entry.name}"]`);
        if (!slot) {
          field.setTarget(entry.name, 0, 0, false);
          return;
        }
        const position = toCanvasPosition(slot.getBoundingClientRect());
        field.setTarget(entry.name, position.x, position.y);
      });
    }

    updateOrbTargets = updateTargets;

    [...triggers, ...modeButtons].forEach(trigger => {
      trigger.addEventListener('pointerenter', () => {
        hoverTrigger = trigger;
        updateTargets();
      });
      trigger.addEventListener('pointerleave', () => {
        hoverTrigger = null;
        updateTargets();
      });
      trigger.addEventListener('focus', () => {
        hoverTrigger = trigger;
        updateTargets();
      });
      trigger.addEventListener('blur', () => {
        hoverTrigger = null;
        updateTargets();
      });
    });

    space.addEventListener('pointermove', event => {
      const rect = space.getBoundingClientRect();
      field.setPointer(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      );
    });

    space.addEventListener('pointerleave', () => field.setPointer(0, 0));
    window.addEventListener('resize', updateTargets);
    const targetObserver = new ResizeObserver(() => window.requestAnimationFrame(updateTargets));
    targetObserver.observe(space);
    targetObserver.observe(grid);
    document.fonts?.ready.then(updateTargets);
    updateTargets();
  }

  applyLocationState();
  initOrbs();
})();
