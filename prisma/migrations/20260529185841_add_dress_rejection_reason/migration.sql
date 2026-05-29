BEGIN;

-- AlterTable: add nullable rejectionReason column to Dress
-- Set by admin.wardrobe.rejectDress (Phase 18), cleared by approveDress + consigner.resubmit.
-- Distinct from internalNotes (which is admin-only and hidden from consigners per CONSIGN-02).
ALTER TABLE "Dress" ADD COLUMN "rejectionReason" TEXT;

COMMIT;
