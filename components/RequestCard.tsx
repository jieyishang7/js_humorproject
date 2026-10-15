import type { Caption, SpotRequest } from "@/lib/captions";
import { CaptionList } from "./CaptionList";

type Props = {
  request: SpotRequest;
  spots: Caption[];
  signedIn: boolean;
  visible?: number;
  footer?: React.ReactNode;
  savedIds?: Set<number>;
};

/** One mood and the AI's place recommendations for it, best-voted first. */
export function RequestCard({ request, spots, signedIn, visible = 4, footer, savedIds }: Props) {
  const date = new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <li id={`request-${request.id}`} className="panel request-card">
      <div className="request-head">
        <div>
          <p className="lab-label">Someone asked · {date}</p>
          <h2 className="request-mood">“{request.mood}”</h2>
        </div>
        <span className="lab-count">
          {spots.length} spot{spots.length === 1 ? "" : "s"}
        </span>
      </div>
      <CaptionList captions={spots} signedIn={signedIn} visible={visible} savedIds={savedIds} emptyText="The AI is still thinking. Refresh in a moment." />
      {footer && <div className="lab-actions">{footer}</div>}
    </li>
  );
}
