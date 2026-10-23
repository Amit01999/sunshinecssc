import { Router } from "express";
import * as ctrl from "../controllers/fee.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { feeCategorySchema, feeStructureSchema, createInvoiceSchema, recordPaymentSchema } from "../validators/fee.validators";
import { ADMIN_ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate);

router.get("/categories", ctrl.listFeeCategories);
router.post("/categories", requireRole(...ADMIN_ROLES), validateBody(feeCategorySchema), ctrl.createFeeCategory);

router.get("/structures", ctrl.listFeeStructures);
router.post("/structures", requireRole(...ADMIN_ROLES), validateBody(feeStructureSchema), ctrl.createFeeStructure);

router.get("/invoices", ctrl.listInvoices);
router.post("/invoices", requireRole(...ADMIN_ROLES), validateBody(createInvoiceSchema), ctrl.createInvoice);
router.get("/invoices/:id", ctrl.getInvoice);
router.post("/invoices/:id/payments", requireRole(...ADMIN_ROLES), validateBody(recordPaymentSchema), ctrl.recordPayment);

export default router;
