// Format Helper - Centralized formatting utilities
class FormatHelper {
    
    // Format currency with consistent decimal places and symbol
    static formatCurrency(amount, showSymbol = true, decimals = 3) {
        const formatted = parseFloat(amount || 0).toFixed(decimals);
        return showSymbol ? `${formatted} د.ك` : formatted;
    }
    
    // Format date with Arabic locale support
    static formatDate(dateString, includeTime = false) {
        if (!dateString) return 'غير محدد';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'تاريخ غير صحيح';
            
            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                calendar: 'gregory'
            };
            
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.hour12 = false;
            }
            
            return date.toLocaleDateString('ar-KW', options);
        } catch (error) {
            console.warn('Date formatting error:', error);
            return 'تاريخ غير صحيح';
        }
    }
    
    // Format numbers with thousands separator
    static formatNumber(number, decimals = 0) {
        return parseFloat(number || 0).toLocaleString('ar-KW', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    
    // Format percentage
    static formatPercentage(value, decimals = 1) {
        return `${parseFloat(value || 0).toFixed(decimals)}%`;
    }
    
    // Format phone number
    static formatPhone(phone) {
        if (!phone) return '';
        // Remove any non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        // Format as +965 XXXX XXXX for Kuwait
        if (cleaned.length === 8) {
            return `+965 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
        }
        return phone; // Return original if not standard Kuwait format
    }
}

// Export for global use and backward compatibility
window.FormatHelper = FormatHelper;

// Maintain backward compatibility with existing formatCurrency and formatDate functions
if (typeof formatCurrency === 'undefined') {
    window.formatCurrency = FormatHelper.formatCurrency;
}
if (typeof formatDate === 'undefined') {
    window.formatDate = FormatHelper.formatDate;
}