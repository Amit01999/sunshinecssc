import { Schema, model, Document, Types } from "mongoose";

export interface IFeeCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeCategorySchema = new Schema<IFeeCategory>(
  { name: { type: String, required: true, unique: true, trim: true }, description: { type: String } },
  { timestamps: true },
);

export const FeeCategory = model<IFeeCategory>("FeeCategory", feeCategorySchema);

export interface IFeeStructureItem {
  categoryId: Types.ObjectId;
  amount: number;
}

export interface IFeeStructure extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  items: IFeeStructureItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureItemSchema = new Schema<IFeeStructureItem>(
  { categoryId: { type: Schema.Types.ObjectId, ref: "FeeCategory", required: true }, amount: { type: Number, required: true, min: 0 } },
  { _id: false },
);

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true, index: true },
    items: { type: [feeStructureItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

feeStructureSchema.index({ classId: 1, academicYearId: 1 }, { unique: true });

export const FeeStructure = model<IFeeStructure>("FeeStructure", feeStructureSchema);

export interface IInvoiceItem {
  categoryId: Types.ObjectId;
  amount: number;
  discount: number;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  feeStructureId?: Types.ObjectId;
  invoiceNumber: string;
  items: IInvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  dueDate: Date;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "FeeCategory", required: true },
    amount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure" },
    invoiceNumber: { type: String, required: true, unique: true },
    items: { type: [invoiceItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["unpaid", "partially_paid", "paid", "overdue"], default: "unpaid", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Invoice = model<IInvoice>("Invoice", invoiceSchema);

export interface IPayment extends Document {
  _id: Types.ObjectId;
  invoiceId: Types.ObjectId;
  amount: number;
  method: "cash" | "bank" | "mobile_banking" | "other";
  receiptNumber: string;
  paidAt: Date;
  recordedBy: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ["cash", "bank", "mobile_banking", "other"], required: true },
    receiptNumber: { type: String, required: true, unique: true },
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
  },
  { timestamps: true },
);

export const Payment = model<IPayment>("Payment", paymentSchema);
