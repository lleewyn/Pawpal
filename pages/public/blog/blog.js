const mainFilters = [...document.querySelectorAll('.main-filters .btn-filter-pill')];
const subFilters = [...document.querySelectorAll('.sub-filters .btn-filter-tag')];
const searchForm = document.querySelector('.blog-search-form');
const searchInput = document.querySelector('#blogSearchInput');
const entries = [...document.querySelectorAll('.blog-entry')];
const emptyState = document.querySelector('#blogEmptyState');
let activeMain = 'all';
let activeTag = 'all';
let searchKeyword = '';

function normalizeText(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function matchesTag(entryTags, expectedTag) {
    if (expectedTag === 'all') return true;
    return entryTags.includes(expectedTag);
}

function applyFilters() {
    let visibleCount = 0;

    entries.forEach((entry) => {
        const main = entry.dataset.main || '';
        const tags = normalizeText(entry.dataset.tags || '').split(/\s+/).filter(Boolean);
        const title = normalizeText(entry.textContent || '');

        const isTipsEntry = main === 'tips';
        const tagMatch = matchesTag(tags, activeTag);
        const searchMatch = !searchKeyword || title.includes(searchKeyword);
        const shouldShow = isTipsEntry
            ? tagMatch && searchMatch
            : true;

        entry.hidden = !shouldShow;
        if (shouldShow) {
            visibleCount += 1;
        }
    });

    if (emptyState) {
        emptyState.hidden = visibleCount > 0;
    }
}

function setActiveFilter(buttons, currentButton) {
    buttons.forEach((button) => button.classList.remove('active'));
    currentButton.classList.add('active');
}

mainFilters.forEach((button) => {
    button.addEventListener('click', () => {
        activeMain = button.dataset.mainTarget || 'all';
        setActiveFilter(mainFilters, button);
        applyFilters();

        const target = button.dataset.mainTarget === 'promo'
            ? '#blog-promo-column'
            : button.dataset.mainTarget === 'news'
                ? '#blog-news-column'
                : button.dataset.scrollTarget;

        if (target) {
            requestAnimationFrame(() => {
                document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    });
});

subFilters.forEach((button) => {
    button.addEventListener('click', () => {
        activeTag = button.dataset.tag || 'all';
        setActiveFilter(subFilters, button);
        applyFilters();
    });
});

if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        searchKeyword = normalizeText(searchInput.value);
        applyFilters();
        document.querySelector('#blog-latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    searchInput.addEventListener('input', () => {
        searchKeyword = normalizeText(searchInput.value);
        applyFilters();
    });
}

const urlParams = new URLSearchParams(window.location.search);
const categoryParam = urlParams.get('category');

if (categoryParam) {
    const categoryMap = {
        dog: 'cho',
        cat: 'meo',
        tips: 'all',
        events: 'promo'
    };

    const normalizedCategory = normalizeText(categoryParam);
    if (normalizedCategory === 'events') {
        const promoButton = mainFilters.find((button) => button.dataset.mainTarget === 'promo');
        promoButton?.click();
    } else if (normalizedCategory === 'tips') {
        const tipsButton = mainFilters.find((button) => button.dataset.mainTarget === 'tips');
        tipsButton?.click();
    } else {
        const matchedTag = categoryMap[normalizedCategory];
        if (matchedTag) {
            const tagButton = subFilters.find((button) => button.dataset.tag === matchedTag);
            tagButton?.click();
        }
    }
}

applyFilters();
