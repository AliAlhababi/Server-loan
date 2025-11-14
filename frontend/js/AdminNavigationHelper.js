// Admin Navigation Helper
// Provides enhanced navigation with multi-tab support

class AdminNavigationHelper {
    constructor() {
        this.contextMenu = null;
        this.setupEventListeners();
    }

    // Setup global event listeners
    setupEventListeners() {
        // Handle right-click context menu for admin elements
        document.addEventListener('contextmenu', (e) => {
            this.handleContextMenu(e);
        });

        // Handle clicks for new tab opening (default behavior)
        document.addEventListener('click', (e) => {
            this.handleAdminNavClick(e);
        });

        // Close context menu on click elsewhere
        document.addEventListener('click', (e) => {
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // Handle right-click context menu
    handleContextMenu(e) {
        const target = e.target.closest('[data-admin-nav]');
        if (!target || !currentUser?.isAdmin) return;

        e.preventDefault();
        
        const navData = this.parseNavigationData(target);
        if (navData) {
            this.showContextMenu(e.pageX, e.pageY, navData);
        }
    }

    // Handle clicks for admin navigation
    handleAdminNavClick(e) {
        const target = e.target.closest('[data-admin-nav]');
        if (!target || !currentUser?.isAdmin) return;

        // Skip if this is a right-click or if clicking on context menu
        if (e.button === 2 || target.closest('.admin-context-menu')) return;

        // Check if shift key is pressed or if it has onclick handler
        const hasOnclick = target.hasAttribute('onclick');
        
        // If shift key is pressed, open in new tab
        if (e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            
            const navData = this.parseNavigationData(target);
            if (navData) {
                this.openInNewTab(navData);
            }
            return;
        }

        // If element has onclick handler, let it execute normally (don't prevent default)
        if (hasOnclick) {
            // Let the onclick handler execute normally
            return;
        }

        // If no onclick handler and no shift key, prevent default and handle navigation
        e.preventDefault();
        e.stopPropagation();
        
        const navData = this.parseNavigationData(target);
        if (navData) {
            this.openInSameTab(navData);
        }
    }

    // Open in same tab (show modal)
    openInSameTab(navData) {
        const { type, params, element } = navData;
        
        // Extract the original onclick function and execute it
        const onclick = element.getAttribute('onclick');
        if (onclick) {
            // Create a temporary function and execute it
            try {
                const func = new Function(onclick);
                func.call(element);
            } catch (error) {
                console.error('Error executing onclick:', error);
            }
        }
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(e) {
        if (!currentUser?.isAdmin) return;

        // Escape key closes context menu
        if (e.key === 'Escape' && this.contextMenu) {
            this.hideContextMenu();
        }
    }

    // Parse navigation data from element
    parseNavigationData(element) {
        const navType = element.getAttribute('data-admin-nav');
        const navParams = element.getAttribute('data-nav-params');
        const title = element.getAttribute('data-nav-title') || element.textContent.trim();

        let params = {};
        try {
            if (navParams) {
                params = JSON.parse(navParams);
            }
        } catch (error) {
            console.warn('Invalid nav params JSON:', navParams);
        }

        // Extract additional params from data attributes
        Object.keys(element.dataset).forEach(key => {
            if (key.startsWith('param')) {
                const paramName = key.replace('param', '').toLowerCase();
                params[paramName] = element.dataset[key];
            }
        });

        return { type: navType, params, title, element };
    }

    // Show context menu
    showContextMenu(x, y, navData) {
        this.hideContextMenu(); // Hide any existing menu

        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'admin-context-menu';
        this.contextMenu.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 200px;
            padding: 8px 0;
            font-size: 14px;
        `;

        const menuItems = [
            {
                icon: 'fas fa-external-link-alt',
                text: 'فتح في تبويب جديد (Shift+Click)',
                action: () => this.openInNewTab(navData)
            },
            {
                icon: 'fas fa-window-maximize',
                text: 'فتح في التبويب الحالي',
                action: () => this.openInSameTab(navData)
            },
            {
                icon: 'fas fa-copy',
                text: 'نسخ الرابط',
                action: () => this.copyLink(navData)
            }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.style.cssText = `
                padding: 10px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: background-color 0.2s;
            `;
            
            menuItem.innerHTML = `
                <i class="${item.icon}" style="width: 16px; color: #666;"></i>
                <span>${item.text}</span>
            `;

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'transparent';
            });

            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                this.hideContextMenu();
            });

            this.contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(this.contextMenu);

        // Adjust position if menu goes off screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = (y - rect.height) + 'px';
        }
    }

    // Hide context menu
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    // Open navigation target in new tab
    openInNewTab(navData) {
        const { type, params } = navData;
        
        console.log('📂 AdminNavigationHelper.openInNewTab called with:', navData);
        
        if (window.adminRouter) {
            window.adminRouter.openInNewTab(type, params);
        } else {
            console.warn('Admin router not available');
        }
    }

    // Copy link to clipboard
    async copyLink(navData) {
        const { type, params } = navData;
        
        if (window.adminRouter) {
            const url = window.adminRouter.generateUrl(type, params);
            try {
                await navigator.clipboard.writeText(url);
                Utils.showToast('تم نسخ الرابط', 'success');
            } catch (error) {
                console.error('Failed to copy link:', error);
                Utils.showToast('فشل في نسخ الرابط', 'error');
            }
        }
    }

    // Add navigation attributes to element
    static addNavigation(element, type, params = {}, title = null) {
        element.setAttribute('data-admin-nav', type);
        if (Object.keys(params).length > 0) {
            element.setAttribute('data-nav-params', JSON.stringify(params));
        }
        if (title) {
            element.setAttribute('data-nav-title', title);
        }
        
        // Add visual indicator for navigatable elements
        element.style.position = 'relative';
        element.setAttribute('title', 'Click لفتح في تبويب جديد، Ctrl+Click للنافذة المنبثقة، Right Click للخيارات');
        
        return element;
    }

    // Create navigation link with multi-tab support
    static createNavLink(text, type, params = {}, className = '') {
        const link = document.createElement('a');
        link.href = '#' + (new URLSearchParams(params).toString() ? 
            `${type}?${new URLSearchParams(params).toString()}` : type);
        link.textContent = text;
        link.className = className;
        
        // Add navigation data
        AdminNavigationHelper.addNavigation(link, type, params, text);
        
        // Handle normal clicks
        link.addEventListener('click', (e) => {
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (window.adminRouter) {
                    window.adminRouter.navigate(type, params);
                }
            }
        });
        
        return link;
    }

    // Update existing elements to support multi-tab navigation
    static enhanceExistingNavigation() {
        // Enhance admin dashboard cards
        document.querySelectorAll('.compact-stat-card.clickable-card').forEach(card => {
            const onclick = card.getAttribute('onclick');
            if (onclick) {
                // Parse the onclick to determine navigation type
                let navType = '';
                let params = {};
                
                if (onclick.includes('usersManagement.show')) {
                    navType = 'admin/users';
                } else if (onclick.includes('loansManagement.show')) {
                    navType = 'admin/loans';
                } else if (onclick.includes('transactionsManagement.show')) {
                    navType = 'admin/transactions';
                } else if (onclick.includes('reportsManagement.show')) {
                    navType = 'admin/reports';
                } else if (onclick.includes('banksManagement.show')) {
                    navType = 'admin/banks';
                } else if (onclick.includes('familyDelegationsManagement.load')) {
                    navType = 'admin/family-delegations';
                } else if (onclick.includes('ticketsManagement.show')) {
                    navType = 'admin/tickets';
                } else if (onclick.includes('whatsappQueueManagement.show')) {
                    navType = 'admin/whatsapp';
                }
                
                if (navType) {
                    const title = card.querySelector('.compact-stat-label')?.textContent || 
                                 card.getAttribute('title') || '';
                    AdminNavigationHelper.addNavigation(card, navType, params, title);
                }
            }
        });

        console.log('✅ Enhanced existing navigation elements for multi-tab support');
    }
}

// Global navigation helper instance
window.adminNavigationHelper = new AdminNavigationHelper();

// Initialize navigation enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (currentUser && currentUser.isAdmin) {
        // Delay to ensure all admin elements are loaded
        setTimeout(() => {
            AdminNavigationHelper.enhanceExistingNavigation();
        }, 1000);
    }
});

// Export for use in other modules
window.AdminNavigationHelper = AdminNavigationHelper;