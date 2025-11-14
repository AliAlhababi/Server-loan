const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const UserService = require('../services/UserService');
const emailService = require('../services/emailService');

const router = express.Router();

// ================== SHARED VALIDATION FUNCTIONS ==================

/**
 * Validate user exists and return user data
 */
async function validateUserExists(userId, errorMessage = 'المستخدم غير موجود') {
  const [users] = await pool.execute('SELECT user_id, Aname, balance FROM users WHERE user_id = ?', [userId]);
  if (users.length === 0) {
    throw new Error(errorMessage);
  }
  return users[0];
}

/**
 * Check if delegation already exists
 */
async function checkExistingDelegation(headId, memberId, statuses = ['pending', 'approved']) {
  const [existing] = await pool.execute(`
    SELECT delegation_id, delegation_status, delegation_type 
    FROM family_delegations 
    WHERE family_head_id = ? AND family_member_id = ? AND delegation_status IN (${statuses.map(() => '?').join(',')})
  `, [headId, memberId, ...statuses]);
  return existing[0] || null;
}

/**
 * Check if user has any existing family delegation (as head or member)
 */
async function checkUserFamilyStatus(userId) {
  const [delegations] = await pool.execute(`
    SELECT delegation_id, delegation_status, delegation_type,
           family_head_id, family_member_id
    FROM family_delegations 
    WHERE (family_head_id = ? OR family_member_id = ?) 
    AND delegation_status IN ('pending', 'approved')
  `, [userId, userId]);
  return delegations;
}

// ================== API ENDPOINTS ==================

/**
 * GET /family/status - Get user's family delegation status
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Check if user is an approved family head
    const [approvedHeadRequest] = await pool.execute(`
      SELECT delegation_id, delegation_status, created_date, notes
      FROM family_delegations 
      WHERE family_head_id = ? AND family_member_id = ? 
      AND delegation_type = 'family_head_request' AND delegation_status = 'approved'
    `, [userId, userId]);

    // Get family members if user is a family head
    const [familyMembers] = await pool.execute(`
      SELECT fd.delegation_id, fd.family_member_id, u.Aname as member_name, 
             u.balance as member_balance, fd.created_date, fd.delegation_status,
             rl.loan_id, rl.loan_amount, rl.installment_amount, rl.status as loan_status,
             rl.loan_closed_date, COALESCE(loan_payments.total_paid, 0) as total_paid,
             (rl.loan_amount - COALESCE(loan_payments.total_paid, 0)) as remaining_amount
      FROM family_delegations fd
      JOIN users u ON fd.family_member_id = u.user_id
      LEFT JOIN requested_loan rl ON u.user_id = rl.user_id AND rl.status = 'approved' AND rl.loan_closed_date IS NULL
      LEFT JOIN (
        SELECT target_loan_id, SUM(credit) as total_paid
        FROM loan
        WHERE status = 'accepted'
        GROUP BY target_loan_id
      ) loan_payments ON rl.loan_id = loan_payments.target_loan_id
      WHERE fd.family_head_id = ? AND fd.delegation_status = 'approved'
      AND fd.delegation_type = 'delegation_request'
      ORDER BY fd.created_date DESC
    `, [userId]);
    
    // Check if user is under family delegation
    const [delegationInfo] = await pool.execute(`
      SELECT fd.delegation_id, fd.family_head_id, u.Aname as head_name,
             fd.created_date, fd.delegation_status
      FROM family_delegations fd
      JOIN users u ON fd.family_head_id = u.user_id
      WHERE fd.family_member_id = ? AND fd.delegation_status = 'approved'
      AND fd.delegation_type = 'delegation_request'
    `, [userId]);

    // Check if user has pending family head request
    const [pendingHeadRequest] = await pool.execute(`
      SELECT delegation_id, delegation_status, created_date, notes
      FROM family_delegations 
      WHERE family_head_id = ? AND family_member_id = ? 
      AND delegation_type = 'family_head_request' AND delegation_status = 'pending'
    `, [userId, userId]);

    // Determine user's family status
    const isApprovedFamilyHead = approvedHeadRequest.length > 0;
    const hasFamilyMembers = familyMembers.length > 0;
    const isFamilyHead = isApprovedFamilyHead || hasFamilyMembers;

    res.json({
      success: true,
      isFamilyHead,
      isApprovedFamilyHead,
      hasFamilyDelegation: delegationInfo.length > 0,
      hasPendingHeadRequest: pendingHeadRequest.length > 0,
      familyMembers,
      delegationInfo: delegationInfo[0] || null,
      pendingHeadRequest: pendingHeadRequest[0] || null,
      approvedHeadRequest: approvedHeadRequest[0] || null
    });
  } catch (error) {
    console.error('خطأ في جلب حالة التفويض العائلي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات التفويض العائلي'
    });
  }
});

/**
 * POST /family/request-family-head - Request to become family head
 */
router.post('/request-family-head', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { notes } = req.body;
    
    // Check if user already has any family delegation
    const existingDelegations = await checkUserFamilyStatus(userId);
    if (existingDelegations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'لديك بالفعل تفويض عائلي نشط أو معلق'
      });
    }
    
    // Create family head request (self-delegation)
    await pool.execute(`
      INSERT INTO family_delegations (
        family_head_id, 
        family_member_id, 
        delegation_status,
        delegation_type,
        notes,
        created_date
      ) VALUES (?, ?, 'pending', 'family_head_request', ?, NOW())
    `, [userId, userId, notes || 'طلب أن يصبح رب أسرة']);
    
    res.json({
      success: true,
      message: 'تم إرسال طلب أن تصبح رب أسرة للمراجعة من الإدارة'
    });
  } catch (error) {
    console.error('خطأ في طلب أن يصبح رب أسرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الطلب'
    });
  }
});

/**
 * POST /family/request-join-family - Request to join existing family
 */
router.post('/request-join-family', verifyToken, async (req, res) => {
  try {
    const { familyHeadId, notes } = req.body;
    const memberId = req.user.user_id;
    
    // Validate input
    if (!familyHeadId) {
      return res.status(400).json({
        success: false,
        message: 'معرف رب الأسرة مطلوب'
      });
    }
    
    if (familyHeadId === memberId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن للمستخدم الانضمام لنفسه كعائلة'
      });
    }
    
    // Validate target user exists
    const targetUser = await validateUserExists(familyHeadId, 'رب الأسرة المطلوب غير موجود');
    
    // Check if user already has family delegation
    const existingDelegations = await checkUserFamilyStatus(memberId);
    if (existingDelegations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'لديك بالفعل تفويض عائلي نشط أو معلق'
      });
    }
    
    // Check if delegation already exists (active only)
    const existingDelegation = await checkExistingDelegation(familyHeadId, memberId);
    if (existingDelegation) {
      return res.status(400).json({
        success: false,
        message: 'طلب التفويض موجود بالفعل لهذا العضو'
      });
    }

    // Check for revoked delegation that can be reactivated
    const [revokedDelegation] = await pool.execute(`
      SELECT delegation_id FROM family_delegations
      WHERE family_head_id = ? AND family_member_id = ? AND delegation_status = 'revoked'
    `, [familyHeadId, memberId]);

    if (revokedDelegation.length > 0) {
      // Reactivate the revoked delegation
      await pool.execute(`
        UPDATE family_delegations
        SET delegation_status = 'pending', notes = ?, revoked_date = NULL, approved_date = NULL
        WHERE delegation_id = ?
      `, [notes || 'إعادة تفعيل طلب انضمام للعائلة', revokedDelegation[0].delegation_id]);

      return res.json({
        success: true,
        message: `تم إعادة إرسال طلب الانضمام لعائلة ${targetUser.Aname} للمراجعة من الإدارة`
      });
    }

    // Create new delegation request
    await pool.execute(`
      INSERT INTO family_delegations (
        family_head_id, family_member_id, delegation_status,
        delegation_type, notes, created_date
      ) VALUES (?, ?, 'pending', 'delegation_request', ?, NOW())
    `, [familyHeadId, memberId, notes || 'طلب انضمام للعائلة']);
    
    res.json({
      success: true,
      message: `تم إرسال طلب الانضمام لعائلة ${targetUser.Aname} للمراجعة من الإدارة`
    });
  } catch (error) {
    console.error('خطأ في طلب الانضمام للعائلة:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في إرسال الطلب'
    });
  }
});

/**
 * POST /family/add-member - Family head adds a member (only for approved family heads)
 */
router.post('/add-member', verifyToken, async (req, res) => {
  try {
    const { memberId, notes } = req.body;
    const familyHeadId = req.user.user_id;
    
    // Validate input
    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العضو مطلوب'
      });
    }
    
    if (familyHeadId === memberId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن للمستخدم تفويض نفسه'
      });
    }
    
    // Validate user is an approved family head
    const [headStatus] = await pool.execute(`
      SELECT delegation_id FROM family_delegations 
      WHERE family_head_id = ? AND family_member_id = ? 
      AND delegation_status = 'approved' AND delegation_type = 'family_head_request'
    `, [familyHeadId, familyHeadId]);
    
    if (headStatus.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'يجب أن تكون رب أسرة معتمد لإضافة أعضاء جدد'
      });
    }
    
    // Validate target member exists
    const targetUser = await validateUserExists(memberId, 'العضو المطلوب غير موجود');
    
    // Check if member already has family delegation
    const memberDelegations = await checkUserFamilyStatus(memberId);
    if (memberDelegations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'العضو لديه بالفعل تفويض عائلي نشط أو معلق'
      });
    }
    
    // Check if delegation already exists (active only)
    const existingDelegation = await checkExistingDelegation(familyHeadId, memberId);
    if (existingDelegation) {
      return res.status(400).json({
        success: false,
        message: 'طلب التفويض موجود بالفعل لهذا العضو'
      });
    }

    // Check for revoked delegation that can be reactivated
    const [revokedDelegation] = await pool.execute(`
      SELECT delegation_id FROM family_delegations
      WHERE family_head_id = ? AND family_member_id = ? AND delegation_status = 'revoked'
    `, [familyHeadId, memberId]);

    if (revokedDelegation.length > 0) {
      // Reactivate the revoked delegation
      await pool.execute(`
        UPDATE family_delegations
        SET delegation_status = 'pending', notes = ?, revoked_date = NULL, approved_date = NULL
        WHERE delegation_id = ?
      `, [notes || `إعادة تفعيل إضافة عضو من قبل رب الأسرة`, revokedDelegation[0].delegation_id]);

      return res.json({
        success: true,
        message: `تم إعادة إرسال طلب إضافة ${targetUser.Aname} للعائلة للمراجعة من الإدارة`
      });
    }

    // Create new delegation request
    await pool.execute(`
      INSERT INTO family_delegations (
        family_head_id, family_member_id, delegation_status,
        delegation_type, notes, created_date
      ) VALUES (?, ?, 'pending', 'delegation_request', ?, NOW())
    `, [familyHeadId, memberId, notes || `إضافة عضو من قبل رب الأسرة`]);
    
    res.json({
      success: true,
      message: `تم إرسال طلب إضافة ${targetUser.Aname} للعائلة للمراجعة من الإدارة`
    });
  } catch (error) {
    console.error('خطأ في إضافة عضو العائلة:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في إضافة عضو العائلة'
    });
  }
});

/**
 * POST /family/make-payment - Family head makes payment for member
 */
router.post('/make-payment', verifyToken, async (req, res) => {
  try {
    const { memberId, paymentType, amount, targetLoanId, memo } = req.body;
    const familyHeadId = req.user.user_id;
    
    // Validate input
    if (!memberId || !paymentType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'معرف العضو، نوع الدفع، والمبلغ مطلوبة'
      });
    }
    
    // Verify delegation exists and is approved
    const [delegationResults] = await pool.execute(`
      SELECT delegation_id FROM family_delegations 
      WHERE family_head_id = ? AND family_member_id = ?
      AND delegation_status = 'approved' AND delegation_type = 'delegation_request'
    `, [familyHeadId, memberId]);
    
    if (delegationResults.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'لا يوجد تفويض نشط لهذا العضو'
      });
    }
    
    let result;
    
    if (paymentType === 'subscription') {
      // Create subscription transaction
      const [transactionResult] = await pool.execute(`
        INSERT INTO transaction (user_id, credit, memo, status, transaction_type, date)
        VALUES (?, ?, ?, 'pending', 'subscription', NOW())
      `, [memberId, amount, `دفعة اشتراك من رب الأسرة - ${memo || ''}`]);
      
      result = {
        transactionId: transactionResult.insertId,
        type: 'subscription'
      };
    } else if (paymentType === 'loan') {
      // Validate loan payment
      if (!targetLoanId) {
        return res.status(400).json({
          success: false,
          message: 'معرف القرض مطلوب لدفع القروض'
        });
      }
      
      const [loanPaymentResult] = await pool.execute(`
        INSERT INTO loan (user_id, target_loan_id, credit, memo, status, date)
        VALUES (?, ?, ?, ?, 'pending', NOW())
      `, [memberId, targetLoanId, amount, `دفعة قرض من رب الأسرة - ${memo || ''}`]);
      
      result = {
        loanPaymentId: loanPaymentResult.insertId,
        type: 'loan'
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'نوع الدفع غير صحيح'
      });
    }
    
    res.json({
      success: true,
      message: 'تم إرسال الدفعة للموافقة من الإدارة',
      payment: result
    });
  } catch (error) {
    console.error('خطأ في دفع العائلة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة الدفعة'
    });
  }
});

/**
 * DELETE /family/revoke-delegation/:delegationId - Revoke family delegation
 */
router.delete('/revoke-delegation/:delegationId', verifyToken, async (req, res) => {
  try {
    const { delegationId } = req.params;
    const userId = req.user.user_id;
    const isAdmin = req.user.user_type === 'admin';
    
    // Get delegation details
    const [delegationResults] = await pool.execute(`
      SELECT family_head_id, family_member_id, delegation_status, delegation_type
      FROM family_delegations 
      WHERE delegation_id = ?
    `, [delegationId]);
    
    if (delegationResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'التفويض غير موجود'
      });
    }
    
    const delegation = delegationResults[0];
    
    // Check authorization - admin, family head, or family member can revoke
    if (!isAdmin && userId !== delegation.family_head_id && userId !== delegation.family_member_id) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لإلغاء هذا التفويض'
      });
    }
    
    // Revoke delegation
    await pool.execute(`
      UPDATE family_delegations 
      SET delegation_status = 'revoked', revoked_date = NOW()
      WHERE delegation_id = ?
    `, [delegationId]);
    
    const actionType = delegation.delegation_type === 'family_head_request' 
      ? 'طلب رب الأسرة' 
      : 'التفويض العائلي';
    
    res.json({
      success: true,
      message: `تم إلغاء ${actionType} بنجاح`
    });
  } catch (error) {
    console.error('خطأ في إلغاء التفويض العائلي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء التفويض العائلي'
    });
  }
});

module.exports = router;