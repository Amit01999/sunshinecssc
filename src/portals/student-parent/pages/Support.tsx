import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStudentScope } from "../useStudentScope";

export default function Support() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { studentId, isParent } = useStudentScope();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");

  const { data: leaveApplications } = useQuery({
    queryKey: ["my-leave"],
    enabled: !isParent,
    queryFn: async () => (await api.get("/leave-applications/mine")).data.data,
  });
  const { data: inquiries } = useQuery({
    queryKey: ["my-inquiries"],
    queryFn: async () => (await api.get("/inquiries/mine")).data.data,
  });

  const submitLeave = useMutation({
    mutationFn: async () => api.post("/leave-applications", { fromDate, toDate, reason }),
    onSuccess: () => {
      toast({ title: "Leave application submitted" });
      setFromDate("");
      setToDate("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["my-leave"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  const submitInquiry = useMutation({
    mutationFn: async () =>
      api.post("/inquiries", {
        subject: inquirySubject,
        message: inquiryMessage,
        // Lets the school office see which child a parent's inquiry concerns, same as the
        // admin Inquiries page already displays when this is set.
        studentId: isParent ? studentId : undefined,
      }),
    onSuccess: () => {
      toast({ title: "Inquiry sent to the school office" });
      setInquirySubject("");
      setInquiryMessage("");
      qc.invalidateQueries({ queryKey: ["my-inquiries"] });
    },
    onError: (err) => toast({ title: "Failed", description: getErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div>
      <PageHeader
        title="Support"
        description={
          isParent
            ? "Send an inquiry to the school office about your child."
            : "Leave applications, inquiries, and school contact information."
        }
      />

      <div className={isParent ? "grid gap-6" : "grid lg:grid-cols-2 gap-6"}>
        {!isParent && (
          <div>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Submit a Leave Application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>From</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>To</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                </div>
                <Textarea placeholder="Reason for leave" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button onClick={() => submitLeave.mutate()} disabled={!fromDate || !toDate || !reason || submitLeave.isPending}>
                  Submit
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {leaveApplications?.length ? (
                leaveApplications.map((l: any) => (
                  <Card key={l._id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="text-sm">
                        <p className="text-gray-700">
                          {new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">{l.reason}</p>
                      </div>
                      <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}>
                        {l.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState icon={LifeBuoy} title="No leave applications yet" />
              )}
            </div>
          </div>
        )}

        <div>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Send an Inquiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isParent && studentId && (
                <p className="text-xs text-gray-400">
                  Regarding: {(user?.children as any[] | undefined)?.find((c) => c._id === studentId)?.firstName ?? "your selected child"}
                </p>
              )}
              <Input placeholder="Subject" value={inquirySubject} onChange={(e) => setInquirySubject(e.target.value)} />
              <Textarea placeholder="Your message" value={inquiryMessage} onChange={(e) => setInquiryMessage(e.target.value)} />
              <Button onClick={() => submitInquiry.mutate()} disabled={!inquirySubject || !inquiryMessage || submitInquiry.isPending}>
                Send
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {inquiries?.length ? (
              inquiries.map((inq: any) => (
                <Card key={inq._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-gray-800">{inq.subject}</p>
                      <Badge variant={inq.status === "closed" ? "secondary" : "outline"}>{inq.status}</Badge>
                    </div>
                    {inq.studentId && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Re: {inq.studentId.firstName} {inq.studentId.lastName}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{inq.message}</p>
                    {inq.responses?.length > 0 && (
                      <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-1">
                        {inq.responses.map((r: any, i: number) => (
                          <p key={i} className="text-xs text-gray-500">
                            {r.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState icon={LifeBuoy} title="No inquiries yet" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
