import express from 'express';
import Complaint from '../models/Complaint.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/complaints - submit complaint
router.post('/', requireAuth, async (req, res) => {
  try {
    const { orderId, severity, message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message required' });
    
    const complaint = await Complaint.create({
      customerId: req.user.sub,
      orderId,
      severity: severity || 'Medium',
      message,
    });
    return res.status(201).json(complaint);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/complaints - list customer's complaints (or all for admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    // If user is admin, return all complaints
    let query = {};
    if (req.user.role !== 'admin') {
      query = { customerId: req.user.sub };
    }
    
    const complaints = await Complaint.find(query)
      .populate('customerId', 'name email phone')
      .populate('orderId', 'id total status')
      .sort({ createdAt: -1 });
    return res.json(complaints);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/complaints/:complaintId/status - admin updates complaint status
router.put('/:complaintId/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const normalizedResolutionNotes = typeof resolutionNotes === 'string' ? resolutionNotes.trim() : '';

    if (!['Open', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Open or Resolved.' });
    }

    const effectiveResolutionNotes = status === 'Resolved'
      ? (normalizedResolutionNotes || 'Admin marked this complaint as resolved. If the issue continues, please raise a new complaint with updated details.')
      : normalizedResolutionNotes;

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      {
        $set: {
          status,
          ...(status === 'Resolved' || normalizedResolutionNotes ? { resolutionNotes: effectiveResolutionNotes } : {}),
        },
      },
      { new: true }
    )
      .populate('customerId', 'name email phone')
      .populate('orderId', 'id total status');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    return res.json({ message: 'Complaint status updated successfully', complaint });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
