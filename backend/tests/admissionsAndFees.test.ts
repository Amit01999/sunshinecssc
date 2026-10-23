import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { loginAsAdmin, authed, seedAcademicStructure } from "./helpers";

const app = createApp();

describe("admissions", () => {
  it("accepts a public application and turns an approval into a real student account", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const applyRes = await request(app).post("/api/admissions").send({
      applicantName: "Future Student",
      dateOfBirth: "2015-01-01",
      guardianName: "Guardian Name",
      guardianPhone: "0170000000",
      appliedClassId: classId,
    });
    expect(applyRes.status).toBe(201);
    const applicationId = applyRes.body.data.id;

    const incompleteApprove = await admin.post(`/api/admissions/${applicationId}/review`).send({ status: "approved" });
    expect(incompleteApprove.status).toBe(400);

    const approveRes = await admin.post(`/api/admissions/${applicationId}/review`).send({
      status: "approved",
      email: `newstudent-${Date.now()}@school.test`,
      classId,
      sectionId,
      rollNumber: "20",
      academicYearId,
    });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.createdStudentUserId).toBeTruthy();

    const doubleApprove = await admin.post(`/api/admissions/${applicationId}/review`).send({ status: "approved" });
    expect(doubleApprove.status).toBe(409);
  });
});

describe("fees", () => {
  it("tracks invoice balance across partial and final payments, and rejects overpayment", async () => {
    const adminToken = await loginAsAdmin(app);
    const admin = authed(app, adminToken);
    const { academicYearId, classId, sectionId } = await seedAcademicStructure(app, adminToken);

    const category = await admin.post("/api/fees/categories").send({ name: `Tuition-${Date.now()}` });
    const student = await admin.post("/api/admin/users").send({
      email: `feestudent-${Date.now()}@school.test`,
      role: "student",
      firstName: "Fee",
      lastName: "Payer",
      classId,
      sectionId,
      rollNumber: "7",
      academicYearId,
    });

    const invoiceRes = await admin.post("/api/fees/invoices").send({
      studentId: student.body.data.profile._id,
      academicYearId,
      items: [{ categoryId: category.body.data._id, amount: 1000 }],
      dueDate: "2099-01-01",
    });
    expect(invoiceRes.status).toBe(201);
    const invoiceId = invoiceRes.body.data._id;

    const overpay = await admin.post(`/api/fees/invoices/${invoiceId}/payments`).send({ amount: 1500, method: "cash" });
    expect(overpay.status).toBe(400);

    const firstPayment = await admin.post(`/api/fees/invoices/${invoiceId}/payments`).send({ amount: 600, method: "cash" });
    expect(firstPayment.status).toBe(201);

    let invoiceDetail = await admin.get(`/api/fees/invoices/${invoiceId}`);
    expect(invoiceDetail.body.data.invoice.status).toBe("partially_paid");

    const secondPayment = await admin.post(`/api/fees/invoices/${invoiceId}/payments`).send({ amount: 400, method: "bank" });
    expect(secondPayment.status).toBe(201);

    invoiceDetail = await admin.get(`/api/fees/invoices/${invoiceId}`);
    expect(invoiceDetail.body.data.invoice.status).toBe("paid");
    expect(invoiceDetail.body.data.payments).toHaveLength(2);
  });
});
