"use client";

import { useState } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquareText } from "lucide-react";

export default function FeedbackTab() {
  const [rating, setRating] = useState(5);
  const [queryRating, setQueryRating] = useState(3);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [filledFor, setFilledFor] = useState<number | null>(null);

  const handleSubmit = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setLoading(true);
    try {
      const res = await amizoneApi.submitFacultyFeedback(credentials, {
        rating,
        queryRating,
        comment,
      });
      toast.success("Feedback submitted");
      setFilledFor(res.filledFor);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Faculty Feedback</h2>
          <p className="text-sm text-muted-foreground">Bulk submit feedback for all faculty</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="font-bold uppercase text-[10px] tracking-widest"
        >
          {loading ? "Submitting…" : "Submit Feedback"}
        </Button>
      </div>

      {filledFor !== null && (
        <Card className="border-primary/20 bg-primary/5 py-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Success</CardTitle>
            <CardDescription className="text-xs">
              Feedback filled for <span className="font-bold tabular-nums">{filledFor}</span> faculty members.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="border-border shadow-sm py-6">
        <CardHeader className="pb-4 p-4 sm:p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Ratings</CardTitle>
          <CardDescription>Select ratings to apply to all faculty</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
          <div className="space-y-3">
            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Faculty rating (1–5)</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={rating === n ? "default" : "outline"}
                  onClick={() => setRating(n)}
                  className="font-bold uppercase text-[10px] tracking-widest tabular-nums h-10 w-10 p-0"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Query rating (1–3)</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={queryRating === n ? "default" : "outline"}
                  onClick={() => setQueryRating(n)}
                  className="font-bold uppercase text-[10px] tracking-widest tabular-nums h-10 w-10 p-0"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Comment</p>
            <Textarea
              placeholder="Optional comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
