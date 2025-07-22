/**
 * Modern Loan Calculator - Kuwait Fund (صندوق الكويت)
 * Implements the legacy "حسبت القرض" calculation logic with modern JavaScript
 * 
 * Mathematical relationship: I ≈ ratio × (L² / B)
 * Where: L = Loan Amount, B = Balance, I = Installment
 */

class LoanCalculator {
    constructor() {
        // Core constants - corrected understanding
        this.CONSTANTS = {
            maxl1: 10000,        // Maximum loan amount
            maxlp1: 3,           // Multiplier for max loan relative to balance
            instp1: 0.02,        // 2% installment rate
            minInstallment: 20,  // Minimum installment amount in KWD
            get monthlyRate() { 
                return this.instp1; // 2% monthly installment rate
            },
            get ratio() { 
                // Corrected ratio to match exact examples: 10K loan + 3550 balance = 200 installment
                // Formula: ratio = (200 * 3550) / (10000 * 10000) = 0.006667
                return 0.02 / 3; // 0.006667 - exact mathematical ratio
            }
        };
    }

    /**
     * Rounds a number UP to the nearest multiple of 5
     * @param {number} value - The value to round
     * @returns {number} - Rounded value
     */
    round5(value) {
        return Math.ceil(value / 5) * 5;
    }

    /**
     * Rounds a number DOWN to the nearest multiple of 5
     * @param {number} value - The value to round
     * @returns {number} - Rounded value
     */
    floor5(value) {
        return Math.floor(value / 5) * 5;
    }

    /**
     * Validates input values
     * @param {number} value - Value to validate
     * @returns {boolean} - True if valid
     */
    isValidInput(value) {
        return value !== null && value !== undefined && 
               !isNaN(value) && value > 0 && isFinite(value);
    }

    /**
     * Calculate flexible installment period based on loan amount and installment
     * @param {number} loanAmount - The loan amount
     * @param {number} installment - The installment amount
     * @returns {number} - Calculated installment period in months
     */
    calculateInstallmentPeriod(loanAmount, installment) {
        if (!loanAmount || !installment || installment <= 0) {
            return 24; // Default 24 months
        }
        
        // Calculate optimal period based on loan amount and installment
        let period = Math.ceil(loanAmount / installment);
        
        // Ensure reasonable minimum bound (6 months minimum, no maximum cap)
        period = Math.max(6, period);
        
        return period;
    }

    /**
     * Scenario 1: Given Loan Amount (L), calculate Balance (B) and Installment (I)
     * @param {number} loanAmount - The loan amount
     * @returns {object} - {balance, installment, loanAmount, installmentPeriod}
     */
    calculateFromLoanAmount(loanAmount) {
        if (!this.isValidInput(loanAmount)) {
            throw new Error('مبلغ القرض غير صحيح');
        }

        // Cap loan amount at maximum
        const L = Math.min(loanAmount, this.CONSTANTS.maxl1);
        
        // Calculate minimum required balance: B = round5(L / 3)
        const B = this.round5(L / this.CONSTANTS.maxlp1);
        
        // Calculate installment: I = round5(ratio × L² / B)
        const baseI = this.round5(this.CONSTANTS.ratio * L * L / B);
        const I = Math.max(baseI, this.CONSTANTS.minInstallment);
        
        // Calculate installment period
        const period = this.calculateInstallmentPeriod(L, I);

        return {
            loanAmount: L,
            balance: B,
            installment: I,
            installmentPeriod: period,
            scenario: 'من مبلغ القرض'
        };
    }

    /**
     * Scenario 2: Given Balance (B), calculate Loan Amount (L) and Installment (I)
     * @param {number} balance - The balance amount
     * @returns {object} - {balance, installment, loanAmount, installmentPeriod}
     */
    calculateFromBalance(balance) {
        if (!this.isValidInput(balance)) {
            throw new Error('الرصيد غير صحيح');
        }

        const B = balance;
        
        // Calculate loan amount: L = min(B × 3, maxl1)
        const L = Math.min(B * this.CONSTANTS.maxlp1, this.CONSTANTS.maxl1);
        
        // Calculate installment: I = round5(ratio × L² / B)
        const baseI = this.round5(this.CONSTANTS.ratio * L * L / B);
        const I = Math.max(baseI, this.CONSTANTS.minInstallment);
        
        // Calculate installment period
        const period = this.calculateInstallmentPeriod(L, I);

        return {
            loanAmount: L,
            balance: B,
            installment: I,
            installmentPeriod: period,
            scenario: 'من الرصيد'
        };
    }

    /**
     * Scenario 3: Given Installment (I), calculate Loan Amount (L) and Balance (B)
     * Fixed version - assumes optimal loan-to-balance ratio of 3:1
     * @param {number} installment - The installment amount
     * @returns {object} - {balance, installment, loanAmount}
     */
    calculateFromInstallment(installment) {
        if (!this.isValidInput(installment)) {
            throw new Error('قيمة القسط غير صحيحة');
        }

        const I = installment;
        
        // Using the relationship: I = ratio × (L² / B) and L = B × 3
        // Substituting: I = ratio × ((B × 3)² / B) = ratio × (9 × B²) / B = ratio × 9 × B
        // Therefore: B = I / (ratio × 9)
        const B = this.round5(I / (this.CONSTANTS.ratio * 9));
        
        // Calculate loan amount: L = B × 3 (capped at maximum)
        const L = Math.min(B * this.CONSTANTS.maxlp1, this.CONSTANTS.maxl1);
        
        // Recalculate installment with actual loan amount (in case it was capped)
        const baseActualI = this.round5(this.CONSTANTS.ratio * L * L / B);
        const actualI = Math.max(baseActualI, this.CONSTANTS.minInstallment);

        return {
            loanAmount: L,
            balance: B,
            installment: actualI,
            scenario: 'من قيمة القسط',
            note: actualI !== I ? `تم تعديل القسط إلى ${actualI} بسبب الحد الأقصى للقرض أو الحد الأدنى للقسط` : null
        };
    }

    /**
     * Calculate monthly installment using 2% rate with balance consideration
     * @param {number} loanAmount - The loan amount
     * @param {number} balance - The balance amount
     * @returns {object} - Installment calculation details
     */
    calculateMonthlyInstallment(loanAmount, balance) {
        // Use the correct formula: I = round5(ratio × L² / B) where ratio = 0.02/3
        const baseInstallment = this.round5(this.CONSTANTS.ratio * loanAmount * loanAmount / balance);
        
        // Apply minimum installment rule (20 KWD minimum)
        const finalInstallment = Math.max(baseInstallment, this.CONSTANTS.minInstallment);
        
        return {
            installment: finalInstallment,
            method: 'formula-based',
            baseCalculation: baseInstallment,
            appliedMinimum: finalInstallment > baseInstallment
        };
    }

    /**
     * Scenario 4: Given Loan Amount (L) and Balance (B), calculate Installment (I)
     * Now uses flexible approach with 2% monthly rate consideration
     * @param {number} loanAmount - The loan amount
     * @param {number} balance - The balance amount
     * @returns {object} - {balance, installment, loanAmount, installmentPeriod}
     */
    calculateInstallment(loanAmount, balance) {
        if (!this.isValidInput(loanAmount) || !this.isValidInput(balance)) {
            throw new Error('مبلغ القرض أو الرصيد غير صحيح');
        }

        const L = Math.min(loanAmount, this.CONSTANTS.maxl1);
        const B = balance;
        
        // Calculate using improved method
        const monthlyInstallment = this.calculateMonthlyInstallment(L, B);
        const I = monthlyInstallment.installment;
        
        // Calculate flexible installment period
        const period = this.calculateInstallmentPeriod(L, I);

        return {
            loanAmount: L,
            balance: B,
            installment: I,
            installmentPeriod: period,
            scenario: 'من مبلغ القرض والرصيد',
            calculationMethod: monthlyInstallment.method
        };
    }

    /**
     * Scenario 5: Given Loan Amount (L) and Installment (I), calculate Balance (B)
     * @param {number} loanAmount - The loan amount
     * @param {number} installment - The installment amount
     * @returns {object} - {balance, installment, loanAmount}
     */
    calculateBalance(loanAmount, installment) {
        if (!this.isValidInput(loanAmount) || !this.isValidInput(installment)) {
            throw new Error('مبلغ القرض أو قيمة القسط غير صحيح');
        }

        const L = Math.min(loanAmount, this.CONSTANTS.maxl1);
        const I = installment;
        
        // Calculate balance: B = round5((ratio × L²) / I)
        const B = this.round5((this.CONSTANTS.ratio * L * L) / I);

        return {
            loanAmount: L,
            balance: B,
            installment: I,
            scenario: 'من مبلغ القرض وقيمة القسط'
        };
    }

    /**
     * Scenario 6: Given Balance (B) and Installment (I), calculate Loan Amount (L)
     * @param {number} balance - The balance amount
     * @param {number} installment - The installment amount
     * @returns {object} - {balance, installment, loanAmount}
     */
    calculateLoanAmount(balance, installment) {
        if (!this.isValidInput(balance) || !this.isValidInput(installment)) {
            throw new Error('الرصيد أو قيمة القسط غير صحيح');
        }

        const B = balance;
        const I = installment;
        
        // Calculate loan amount: L = floor5(√((B × I) / ratio))
        const L = this.floor5(Math.sqrt((B * I) / this.CONSTANTS.ratio));
        
        // Cap at maximum loan amount
        const cappedL = Math.min(L, this.CONSTANTS.maxl1);

        return {
            loanAmount: cappedL,
            balance: B,
            installment: I,
            scenario: 'من الرصيد وقيمة القسط'
        };
    }

    /**
     * Auto-calculate based on filled fields
     * @param {object} inputs - {loanAmount, balance, installment}
     * @returns {object} - Calculation result
     */
    autoCalculate(inputs) {
        const { loanAmount, balance, installment } = inputs;
        
        // Count filled fields
        const filledFields = [
            this.isValidInput(loanAmount),
            this.isValidInput(balance),
            this.isValidInput(installment)
        ].filter(Boolean).length;

        if (filledFields === 0) {
            throw new Error('يرجى إدخال قيمة واحدة على الأقل');
        }

        if (filledFields === 1) {
            // Single field scenarios
            if (this.isValidInput(loanAmount)) {
                return this.calculateFromLoanAmount(loanAmount);
            }
            if (this.isValidInput(balance)) {
                return this.calculateFromBalance(balance);
            }
            if (this.isValidInput(installment)) {
                return this.calculateFromInstallment(installment);
            }
        }

        if (filledFields === 2) {
            // Two field scenarios
            if (this.isValidInput(loanAmount) && this.isValidInput(balance)) {
                return this.calculateInstallment(loanAmount, balance);
            }
            if (this.isValidInput(loanAmount) && this.isValidInput(installment)) {
                return this.calculateBalance(loanAmount, installment);
            }
            if (this.isValidInput(balance) && this.isValidInput(installment)) {
                return this.calculateLoanAmount(balance, installment);
            }
        }

        if (filledFields === 3) {
            // All fields filled - verify consistency
            const result = this.calculateInstallment(loanAmount, balance);
            const expectedInstallment = result.installment;
            const tolerance = 5; // Allow 5 KWD tolerance
            
            if (Math.abs(expectedInstallment - installment) <= tolerance) {
                return {
                    loanAmount: result.loanAmount,
                    balance: result.balance,
                    installment: result.installment,
                    scenario: 'تحقق من القيم',
                    note: 'القيم متسقة مع بعضها البعض'
                };
            } else {
                throw new Error(`القيم غير متسقة. القسط المتوقع: ${expectedInstallment.toFixed(3)} د.ك`);
            }
        }

        throw new Error('خطأ غير متوقع في الحساب');
    }

    /**
     * Format currency value for display
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'KWD',
            minimumFractionDigits: 3
        }).format(amount || 0);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoanCalculator;
}