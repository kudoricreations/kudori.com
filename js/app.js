/**
 * Builds the sidebar (and its small-screen dropdown twin) from data/menu.json,
 * and renders the "content" of whichever item is selected into #content.
 * Nothing here is menu-specific: every label, icon, and page comes from the JSON file.
 */
(function () {
    'use strict';

    var MENU_URL = 'data/menu.json';

    var sidebarList = document.getElementById('sidebar-menu');
    var mobileMenu = document.getElementById('mobile-menu');
    var content = document.getElementById('content');

    // hash path (eg. "dashboard/charts") -> { link, submenuIds, contentHtml }
    var registry = {};
    // ordered list of every item that has renderable content, for picking a default page
    var leafOrder = [];

    var submenuCounter = 0;
    var activeLink = null;

    function slugify(label) {
        return String(label)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'item';
    }

    function iconClass(icon) {
        // Accept "fa-dashboard" or a bare "dashboard".
        if (!icon) return 'fa-circle-o';
        return icon.indexOf('fa-') === 0 ? icon : 'fa-' + icon;
    }

    function renderGroup(items, container, pathSlugs, pathLabels, ancestorSubmenuIds) {
        Object.keys(items).forEach(function (label) {
            var item = items[label] || {};
            var slug = slugify(label);
            var itemPathSlugs = pathSlugs.concat([slug]);
            var itemPathLabels = pathLabels.concat([label]);
            var hash = itemPathSlugs.join('/');

            if (item.children && Object.keys(item.children).length) {
                renderParentItem(item, label, container, itemPathSlugs, itemPathLabels, ancestorSubmenuIds, hash);
            } else {
                renderLeafItem(item, label, container, hash, itemPathLabels, ancestorSubmenuIds);
            }
        });
    }

    function renderParentItem(item, label, container, pathSlugs, pathLabels, ancestorSubmenuIds, hash) {
        submenuCounter += 1;
        var submenuId = 'submenu-' + submenuCounter;

        var toggle = document.createElement('a');
        toggle.href = '#' + submenuId;
        toggle.setAttribute('data-toggle', 'collapse');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.className = 'bg-dark list-group-item list-group-item-action flex-column align-items-start';

        var row = document.createElement('div');
        row.className = 'd-flex w-100 justify-content-start align-items-center';
        row.innerHTML =
            '<span class="fa ' + iconClass(item.icon) + ' fa-fw mr-3"></span>' +
            '<span class="menu-collapsed">' + escapeHtml(label) + '</span>' +
            '<span class="submenu-icon ml-auto"></span>';
        toggle.appendChild(row);
        container.appendChild(toggle);

        var submenu = document.createElement('div');
        submenu.id = submenuId;
        submenu.className = 'collapse sidebar-submenu';
        container.appendChild(submenu);

        // A parent item can *also* carry its own content; clicking the label
        // (anywhere outside the expand caret) can then navigate to it too.
        if (item.content) {
            registerLeaf(hash, toggle, item.content, ancestorSubmenuIds, pathLabels);
            toggle.addEventListener('click', function (e) {
                if (e.target.closest('.submenu-icon')) return;
                navigate(hash);
            });
        }

        renderGroup(item.children, submenu, pathSlugs, pathLabels, ancestorSubmenuIds.concat([submenuId]));
    }

    function renderLeafItem(item, label, container, hash, pathLabels, ancestorSubmenuIds) {
        var link = document.createElement('a');
        link.href = '#' + hash;
        link.className = 'bg-dark list-group-item list-group-item-action';

        var row = document.createElement('div');
        row.className = 'd-flex w-100 justify-content-start align-items-center';

        if (item.action === 'toggle-sidebar') {
            row.innerHTML =
                '<span id="collapse-icon" class="fa ' + iconClass(item.icon) + ' fa-2x mr-3"></span>' +
                '<span id="collapse-text" class="menu-collapsed">' + escapeHtml(label) + '</span>';
            link.appendChild(row);
            link.addEventListener('click', function (e) {
                e.preventDefault();
                toggleSidebar();
            });
        } else {
            row.innerHTML =
                '<span class="fa ' + iconClass(item.icon) + ' fa-fw mr-3"></span>' +
                '<span class="menu-collapsed">' + escapeHtml(label) + '</span>';
            link.appendChild(row);
            link.addEventListener('click', function (e) {
                e.preventDefault();
                navigate(hash);
            });
            if (item.content) {
                registerLeaf(hash, link, item.content, ancestorSubmenuIds, pathLabels);
            }
        }

        container.appendChild(link);
    }

    function registerLeaf(hash, link, contentHtml, ancestorSubmenuIds, pathLabels) {
        registry[hash] = {
            link: link,
            submenuIds: ancestorSubmenuIds.slice(),
            content: contentHtml
        };
        leafOrder.push({ hash: hash, label: (pathLabels || []).join(' › '), content: contentHtml });
    }

    function renderSidebar(menu) {
        Object.keys(menu).forEach(function (sectionName) {
            var separator = document.createElement('li');
            separator.className = 'list-group-item sidebar-separator-title text-muted d-flex align-items-center menu-collapsed';
            separator.innerHTML = '<small>' + escapeHtml(sectionName.toUpperCase()) + '</small>';
            sidebarList.appendChild(separator);

            renderGroup(menu[sectionName] || {}, sidebarList, [], [], []);
        });
    }

    function renderMobileMenu() {
        if (!mobileMenu) return;
        leafOrder.forEach(function (leaf) {
            var a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#' + leaf.hash;
            a.textContent = leaf.label;
            a.addEventListener('click', function (e) {
                e.preventDefault();
                navigate(leaf.hash);
            });
            mobileMenu.appendChild(a);
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function navigate(hash) {
        if (window.location.hash === '#' + hash) {
            renderContent(hash);
        } else {
            window.location.hash = hash;
        }
    }

    function renderContent(hash) {
        var entry = registry[hash];
        if (!entry) {
            content.innerHTML = '<h1>Not found</h1><p>No content is configured for &ldquo;' + escapeHtml(hash) + '&rdquo;.</p>';
            return;
        }

        content.innerHTML = entry.content;

        if (activeLink) activeLink.classList.remove('active');
        entry.link.classList.add('active');
        activeLink = entry.link;

        entry.submenuIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el && window.jQuery) window.jQuery(el).collapse('show');
        });
    }

    function handleHashChange() {
        var hash = window.location.hash.replace(/^#/, '');
        if (!hash) return;
        renderContent(hash);
    }

    function pickDefaultHash() {
        return leafOrder.length ? leafOrder[0].hash : null;
    }

    function toggleSidebar() {
        document.querySelectorAll('.menu-collapsed').forEach(function (el) { el.classList.toggle('d-none'); });
        document.querySelectorAll('.sidebar-submenu').forEach(function (el) { el.classList.toggle('d-none'); });
        document.querySelectorAll('.submenu-icon').forEach(function (el) { el.classList.toggle('d-none'); });

        var sidebar = document.getElementById('sidebar-container');
        if (sidebar) {
            sidebar.classList.toggle('sidebar-expanded');
            sidebar.classList.toggle('sidebar-collapsed');
        }

        var separatorTitle = document.querySelector('.sidebar-separator-title');
        if (separatorTitle) separatorTitle.classList.toggle('d-flex');

        var icon = document.getElementById('collapse-icon');
        if (icon) {
            icon.classList.toggle('fa-angle-double-left');
            icon.classList.toggle('fa-angle-double-right');
        }
    }

    function showLoadError(err) {
        console.error('Unable to load or parse ' + MENU_URL + ':', err);
        content.innerHTML =
            '<h1>Unable to load menu</h1>' +
            '<p>The site configuration file (<code>' + MENU_URL + '</code>) could not be loaded or contains invalid JSON.</p>' +
            '<p>Open the browser console for details.</p>';
    }

    function preventDemoFormSubmits() {
        content.addEventListener('submit', function (e) {
            if (e.target.tagName === 'FORM') {
                e.preventDefault();
                console.info('Static site: form submission ignored (demo content only).');
            }
        });
    }

    function init() {
        preventDemoFormSubmits();

        fetch(MENU_URL)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                }
                return response.json();
            })
            .then(function (menu) {
                renderSidebar(menu);
                renderMobileMenu();

                var initialHash = window.location.hash.replace(/^#/, '') || pickDefaultHash();
                if (initialHash) {
                    if (window.location.hash !== '#' + initialHash) {
                        window.location.hash = initialHash;
                    } else {
                        renderContent(initialHash);
                    }
                } else {
                    content.innerHTML = '<h1>No content configured</h1><p>Add items with a "content" property to data/menu.json.</p>';
                }

                window.addEventListener('hashchange', handleHashChange);
            })
            .catch(showLoadError);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
