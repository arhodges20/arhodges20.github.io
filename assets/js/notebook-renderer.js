// Notebook Renderer
(function() {
    'use strict';

    // Configure marked.js
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // Navigation state
    let currentPath = [];
    let currentContent = null;

    // Build navigation tree
    function buildNavTree(data, parentKey = '', level = 0) {
        const navItems = [];
        const processedKeys = new Set();
        
        // First, handle README if it exists
        if (data.README && data.README.content) {
            const itemKey = parentKey ? `${parentKey}/README` : 'README';
            // Use parent directory name for README, or "Overview" for root
            let readmeName = 'Overview';
            if (parentKey) {
                const parentParts = parentKey.split('/');
                const parentName = parentParts[parentParts.length - 1];
                readmeName = formatDisplayName(parentName);
            }
            navItems.push({
                type: 'file',
                key: itemKey,
                name: readmeName,
                path: data.README.path,
                content: data.README.content,
                level: level
            });
            processedKeys.add('README');
        }
        
        // Then process other items
        for (const key in data) {
            if (!data.hasOwnProperty(key) || processedKeys.has(key)) continue;
            
            const item = data[key];
            const itemKey = parentKey ? `${parentKey}/${key}` : key;
            
            if (item && item.content && typeof item.content === 'string') {
                // It's a markdown file
                const displayName = formatDisplayName(key);
                navItems.push({
                    type: 'file',
                    key: itemKey,
                    name: displayName,
                    path: item.path,
                    content: item.content,
                    level: level
                });
            } else if (typeof item === 'object' && item !== null) {
                // It's a directory - check if it has any content
                const hasContent = Object.keys(item).length > 0;
                if (hasContent) {
                    const displayName = formatDisplayName(key);
                    const children = buildNavTree(item, itemKey, level + 1);
                    
                    // Check if this directory has a README
                    let readmeContent = null;
                    if (item.README && item.README.content) {
                        readmeContent = item.README.content;
                    }
                    
                    navItems.push({
                        type: 'directory',
                        key: itemKey,
                        name: displayName,
                        children: children,
                        readme: readmeContent,
                        level: level
                    });
                }
            }
        }
        
        return navItems;
    }

    // Format display name (convert kebab-case to Title Case)
    function formatDisplayName(key) {
        // Handle special cases
        if (key === 'README') return 'Overview';
        if (key === 'credential-access') return 'Credential Access';
        if (key === 'initial-access') return 'Initial Access';
        if (key === 'pre-intrusion') return 'Pre-Intrusion';
        if (key === 'detection-templates') return 'Detection Templates';
        
        // Convert kebab-case to Title Case
        return key
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/_/g, ' ');
    }

    // Render navigation
    function renderNav(navItems, container, isRoot = false) {
        navItems.forEach((item, index) => {
            // Add section divider for root level major sections
            if (isRoot && index > 0 && (item.name === 'Methodology' || item.name === 'Detection Templates' || item.name === 'Attacker Objectives')) {
                const divider = document.createElement('div');
                divider.style.height = '1px';
                divider.style.backgroundColor = '#e0e0e0';
                divider.style.margin = '1rem 0';
                container.appendChild(divider);
            }
            
            const li = document.createElement('li');
            li.className = 'notebook-nav-item';
            
            const link = document.createElement('a');
            link.href = 'javascript:void(0)';
            link.className = 'notebook-nav-link';
            link.dataset.key = item.key;
            link.dataset.type = item.type;
            
            // Add icon
            const icon = document.createElement('i');
            if (item.type === 'directory') {
                icon.className = 'fas fa-folder';
            } else {
                icon.className = 'fas fa-file-alt';
            }
            link.appendChild(icon);
            
            // Add text
            const text = document.createTextNode(item.name);
            link.appendChild(text);
            
            // Add folder toggle for directories
            if (item.type === 'directory' && item.children && item.children.length > 0) {
                const toggle = document.createElement('i');
                toggle.className = 'fas fa-chevron-down notebook-nav-folder-toggle';
                toggle.style.marginLeft = 'auto';
                link.appendChild(toggle);
                
                // Toggle folder on click
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const subUl = li.querySelector('.notebook-nav-sub');
                    if (subUl) {
                        subUl.classList.toggle('collapsed');
                        toggle.classList.toggle('collapsed');
                    }
                });
            }
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // If it's a directory with children, toggle it first
                if (item.type === 'directory' && item.children && item.children.length > 0) {
                    const subUl = li.querySelector('.notebook-nav-sub');
                    const toggle = link.querySelector('.notebook-nav-folder-toggle');
                    if (subUl && toggle) {
                        // Only toggle if clicking the link itself, not the toggle icon
                        if (e.target !== toggle && !toggle.contains(e.target)) {
                            subUl.classList.toggle('collapsed');
                            toggle.classList.toggle('collapsed');
                        }
                    }
                }
                navigateToItem(item);
            });
            
            li.appendChild(link);
            container.appendChild(li);
            
            // Render children if it's a directory
            if (item.type === 'directory' && item.children && item.children.length > 0) {
                const subUl = document.createElement('ul');
                subUl.className = 'notebook-nav-sub';
                // Start collapsed for cleaner UI - will be expanded if active
                subUl.classList.add('collapsed');
                renderNav(item.children, subUl, false);
                li.appendChild(subUl);
            }
        });
    }

    // Navigate to an item
    function navigateToItem(item) {
        // Save current scroll position
        const scrollPosition = window.scrollY || window.pageYOffset;
        
        // Update active state
        document.querySelectorAll('.notebook-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-key="${item.key}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            // Expand parent folders if needed
            expandParentFolders(activeLink);
        }
        
        // Set current content
        if (item.type === 'file') {
            currentContent = item.content;
            currentPath = item.key.split('/');
        } else if (item.type === 'directory' && item.readme) {
            currentContent = item.readme;
            currentPath = item.key.split('/');
        } else {
            // Directory without README - show placeholder
            currentContent = `# ${item.name}\n\nThis section contains multiple items. Please select a specific item from the navigation.`;
            currentPath = item.key.split('/');
        }
        
        renderContent();
        updateBreadcrumb();
        
        // Restore scroll position after content update
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
        });
    }
    
    // Expand parent folders to show active item
    function expandParentFolders(activeLink) {
        let parent = activeLink.closest('.notebook-nav-sub');
        while (parent) {
            parent.classList.remove('collapsed');
            // Find the parent link that contains the toggle
            const parentItem = parent.previousElementSibling;
            if (parentItem) {
                const toggle = parentItem.querySelector('.notebook-nav-folder-toggle');
                if (toggle) {
                    toggle.classList.remove('collapsed');
                }
            }
            parent = parent.parentElement?.closest('.notebook-nav-sub');
        }
    }

    // Render markdown content
    function renderContent() {
        const container = document.getElementById('markdownContent');
        if (!container || !currentContent) return;
        
        if (typeof marked !== 'undefined') {
            container.innerHTML = marked.parse(currentContent);
        } else {
            // Fallback if marked.js isn't loaded
            container.innerHTML = '<pre>' + escapeHtml(currentContent) + '</pre>';
        }
    }

    // Update breadcrumb
    function updateBreadcrumb() {
        const container = document.getElementById('breadcrumbNav');
        if (!container) return;
        
        const breadcrumbs = ['<a href="javascript:void(0)" data-key="">Detection Notebook</a>'];
        
        let currentKey = '';
        currentPath.forEach((segment, index) => {
            currentKey += (currentKey ? '/' : '') + segment;
            const displayName = formatDisplayName(segment);
            if (index < currentPath.length - 1) {
                breadcrumbs.push(`<a href="javascript:void(0)" data-key="${currentKey}">${displayName}</a>`);
            } else {
                breadcrumbs.push(`<span>${displayName}</span>`);
            }
        });
        
        container.innerHTML = breadcrumbs.join(' / ');
        
        // Add click handlers to breadcrumb links
        container.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = link.dataset.key;
                if (key) {
                    const item = findItemByKey(key);
                    if (item) {
                        navigateToItem(item);
                    }
                } else {
                    // Root
                    const rootItem = findItemByKey('README');
                    if (rootItem) {
                        navigateToItem(rootItem);
                    }
                }
            });
        });
    }

    // Find item by key in the nav tree
    function findItemByKey(key) {
        if (!key || key === 'README') {
            // Return root README
            if (notebookData.README && notebookData.README.content) {
                return {
                    type: 'file',
                    key: 'README',
                    name: 'Overview',
                    content: notebookData.README.content
                };
            }
            return null;
        }
        
        const path = key.split('/');
        let current = notebookData;
        
        for (let i = 0; i < path.length; i++) {
            if (current && current[path[i]]) {
                current = current[path[i]];
            } else {
                return null;
            }
        }
        
        if (!current) return null;
        
        // Check if it's a file or directory
        if (current.content && typeof current.content === 'string') {
            return {
                type: 'file',
                key: key,
                name: formatDisplayName(path[path.length - 1]),
                content: current.content
            };
        } else if (typeof current === 'object' && current !== null) {
            // It's a directory - check for README
            const displayName = formatDisplayName(path[path.length - 1]);
            const readmeContent = (current.README && current.README.content) ? current.README.content : null;
            return {
                type: 'directory',
                key: key,
                name: displayName,
                readme: readmeContent
            };
        }
        
        return null;
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    function init() {
        if (typeof notebookData === 'undefined') {
            console.error('Notebook data not loaded');
            document.getElementById('markdownContent').innerHTML = '<p>Error: Notebook data not loaded. Please refresh the page.</p>';
            return;
        }
        
        // Build navigation tree
        const navTree = [];
        
        // Add root README
        if (notebookData.README && notebookData.README.content) {
            navTree.push({
                type: 'file',
                key: 'README',
                name: 'Overview',
                content: notebookData.README.content
            });
        }
        
        // Add methodology
        if (notebookData.methodology) {
            const methodologyData = notebookData.methodology;
            const methodologyChildren = buildNavTree(methodologyData, 'methodology', 0);
            const methodologyReadme = methodologyData.README && methodologyData.README.content ? methodologyData.README.content : null;
            
            navTree.push({
                type: 'directory',
                key: 'methodology',
                name: 'Methodology',
                children: methodologyChildren,
                readme: methodologyReadme
            });
        }
        
        // Add detection-templates
        if (notebookData['detection-templates']) {
            const templateData = notebookData['detection-templates'];
            const templateChildren = buildNavTree(templateData, 'detection-templates', 0);
            const templateReadme = templateData.README && templateData.README.content ? templateData.README.content : null;
            
            navTree.push({
                type: 'directory',
                key: 'detection-templates',
                name: 'Detection Templates',
                children: templateChildren,
                readme: templateReadme
            });
        }
        
        // Add attacker-objectives
        if (notebookData['attacker-objectives']) {
            const objectiveItems = buildNavTree(notebookData['attacker-objectives'], 'attacker-objectives', 0);
            navTree.push(...objectiveItems);
        }
        
        // Render navigation
        const navContainer = document.getElementById('notebookNav');
        if (navContainer) {
            renderNav(navTree, navContainer, true);
        }
        
        // Load root README by default
        if (notebookData.README && notebookData.README.content) {
            navigateToItem({
                type: 'file',
                key: 'README',
                name: 'Overview',
                content: notebookData.README.content
            });
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

