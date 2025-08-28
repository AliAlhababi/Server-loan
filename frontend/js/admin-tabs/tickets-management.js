// Tickets Management Tab for Admin Dashboard
class TicketsManagement {
    constructor(adminDashboard) {
        this.adminDashboard = adminDashboard;
        this.tickets = [];
        this.stats = {};
    }

    // Show tickets management interface
    async show() {
        console.log('Loading tickets management...');
        this.adminDashboard.currentView = 'tickets';
        
        const content = `
            <div class="admin-section">
                <div class="section-header">
                    <h3><i class="fas fa-envelope"></i> إدارة الرسائل والتذاكر</h3>
                    <div class="section-actions">
                        <button onclick="ticketsManagement.refreshTickets()" class="btn btn-secondary">
                            <i class="fas fa-sync-alt"></i> تحديث
                        </button>
                    </div>
                </div>

                <!-- Tickets Statistics -->
                <div class="tickets-stats-grid">
                    <div class="stat-card open-tickets">
                        <div class="stat-icon">
                            <i class="fas fa-envelope-open"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="openTicketsCount">0</span>
                            <span class="stat-label">رسائل مفتوحة</span>
                        </div>
                    </div>
                    <div class="stat-card closed-tickets">
                        <div class="stat-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="closedTicketsCount">0</span>
                            <span class="stat-label">رسائل مغلقة</span>
                        </div>
                    </div>
                    <div class="stat-card total-tickets">
                        <div class="stat-icon">
                            <i class="fas fa-inbox"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="totalTicketsCount">0</span>
                            <span class="stat-label">إجمالي الرسائل</span>
                        </div>
                    </div>
                </div>

                <!-- Tickets Filter -->
                <div class="tickets-filters">
                    <div class="filter-group">
                        <label>الحالة:</label>
                        <select id="statusFilter" onchange="ticketsManagement.filterTickets()">
                            <option value="">جميع الحالات</option>
                            <option value="open">مفتوحة</option>
                            <option value="closed">مغلقة</option>
                        </select>
                    </div>
                </div>

                <!-- Tickets List -->
                <div class="tickets-container">
                    <div id="ticketsContent" class="loading-content">
                        <i class="fas fa-spinner fa-spin"></i> جاري تحميل الرسائل...
                    </div>
                </div>
            </div>
        `;

        this.adminDashboard.contentArea.innerHTML = content;
        await this.loadTickets();
        await this.loadStats();
    }

    // Load tickets from API
    async loadTickets() {
        try {
            const result = await apiCall('/messages/admin/all');
            
            if (result.success) {
                this.tickets = result.tickets;
                this.displayTickets(this.tickets);
            } else {
                throw new Error(result.message || 'فشل في تحميل الرسائل');
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            document.getElementById('ticketsContent').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل الرسائل: ${error.message}</p>
                    <button onclick="ticketsManagement.loadTickets()" class="btn btn-primary">
                        <i class="fas fa-retry"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    // Load ticket statistics
    async loadStats() {
        try {
            const result = await apiCall('/messages/admin/stats');
            
            if (result.success) {
                this.stats = result.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading ticket stats:', error);
        }
    }

    // Update statistics display
    updateStatsDisplay() {
        const { stats } = this;
        
        document.getElementById('openTicketsCount').textContent = stats.open_tickets || 0;
        document.getElementById('closedTicketsCount').textContent = stats.closed_tickets || 0;
        document.getElementById('totalTicketsCount').textContent = stats.total_tickets || 0;
    }

    // Display tickets
    displayTickets(tickets) {
        const ticketsContainer = document.getElementById('ticketsContent');
        
        if (!tickets || tickets.length === 0) {
            ticketsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>لا توجد رسائل</p>
                </div>
            `;
            return;
        }

        const ticketsHTML = tickets.map(ticket => `
            <div class="admin-ticket-card">
                <div class="ticket-header">
                    <div class="ticket-main-info">
                        <h4 class="ticket-subject">${ticket.subject}</h4>
                        <div class="ticket-meta">
                            <span class="ticket-user">
                                <i class="fas fa-user"></i> ${ticket.user_name}
                            </span>
                            <span class="ticket-date">
                                <i class="fas fa-calendar"></i> ${FormatHelper.formatDate(ticket.created_at)}
                            </span>
                        </div>
                    </div>
                    <div class="ticket-status-info">
                        <span class="ticket-status ${ticket.status}">${ticket.status_arabic}</span>
                    </div>
                </div>
                
                <div class="ticket-content">
                    <p>${ticket.message.replace(/\n/g, '<br>')}</p>
                </div>

                ${ticket.admin_notes ? `
                    <div class="ticket-admin-notes">
                        <strong><i class="fas fa-user-shield"></i> ملاحظات الإدارة:</strong><br>
                        ${ticket.admin_notes.replace(/\n/g, '<br>')}
                        ${ticket.resolved_by_name ? `<br><small>بواسطة: ${ticket.resolved_by_name}</small>` : ''}
                    </div>
                ` : ''}

                <div class="ticket-actions">
                    <div class="status-actions">
                        <select class="status-select" data-ticket-id="${ticket.ticket_id}" onchange="ticketsManagement.updateTicketStatus(${ticket.ticket_id}, this.value)">
                            <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>مفتوحة</option>
                            <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>مغلقة</option>
                        </select>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="ticketsManagement.showResponseModal(${ticket.ticket_id}, '${ticket.subject}', '${ticket.user_name}')">
                        <i class="fas fa-reply"></i> رد
                    </button>
                </div>
            </div>
        `).join('');

        ticketsContainer.innerHTML = ticketsHTML;
    }

    // Filter tickets
    filterTickets() {
        const statusFilter = document.getElementById('statusFilter').value;

        let filteredTickets = this.tickets;

        if (statusFilter) {
            filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
        }

        this.displayTickets(filteredTickets);
    }

    // Update ticket status
    async updateTicketStatus(ticketId, newStatus) {
        try {
            // Show loading on the select element
            const selectElement = document.querySelector(`select[data-ticket-id="${ticketId}"]`);
            if (selectElement) {
                selectElement.disabled = true;
                selectElement.style.opacity = '0.6';
            }
            
            const result = await apiCall(`/messages/${ticketId}/status`, 'PUT', {
                status: newStatus
            });

            if (result.success) {
                showToast('تم تحديث حالة الرسالة بنجاح', 'success');
                await this.refreshTickets();
            } else {
                throw new Error(result.message || 'فشل في تحديث حالة الرسالة');
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            showToast('حدث خطأ في تحديث حالة الرسالة', 'error');
            // Reset select to original value on error
            const selectElement = document.querySelector(`select[data-ticket-id="${ticketId}"]`);
            if (selectElement) {
                selectElement.disabled = false;
                selectElement.style.opacity = '1';
            }
        }
    }

    // Show response modal
    showResponseModal(ticketId, subject, userName) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-reply"></i> الرد على رسالة: ${subject}</h3>
                    <button onclick="this.closest('.modal').remove()" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>من:</strong> ${userName}</p>
                    <p><strong>الموضوع:</strong> ${subject}</p>
                    <form id="responseForm">
                        <div class="form-group">
                            <label for="adminNotes">ملاحظات الإدارة:</label>
                            <textarea id="adminNotes" name="admin_notes" rows="4" placeholder="اكتب ردك هنا..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="responseStatus">تحديث الحالة:</label>
                            <select id="responseStatus" name="status" required>
                                <option value="open">مفتوحة</option>
                                <option value="closed">مغلقة</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> إرسال الرد
                            </button>
                            <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-secondary">
                                <i class="fas fa-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        modal.querySelector('#responseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                // Disable submit button during request
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
                }
                
                const result = await apiCall(`/messages/${ticketId}/status`, 'PUT', {
                    status: formData.get('status'),
                    admin_notes: formData.get('admin_notes')
                });

                if (result.success) {
                    showToast('تم إرسال الرد وتحديث حالة الرسالة بنجاح', 'success');
                    modal.remove();
                    await this.refreshTickets();
                } else {
                    throw new Error(result.message || 'فشل في إرسال الرد');
                }
            } catch (error) {
                console.error('Error sending response:', error);
                showToast('حدث خطأ في إرسال الرد', 'error');
                // Re-enable submit button on error
                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الرد';
                }
            }
        });
    }

    // Refresh tickets
    async refreshTickets() {
        await this.loadTickets();
        await this.loadStats();
    }
}