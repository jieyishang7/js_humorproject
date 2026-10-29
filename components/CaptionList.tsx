import { parseSpot, type Caption } from "@/lib/captions";
import { PlanButton } from "./PlanButton";
import { SpotImageButton } from "./SpotImageButton";
import { VoteButtons } from "./VoteButtons";

type Props = { captions: Caption[]; signedIn: boolean; visible?: number; emptyText?: string; savedIds?: Set<number> };

/**
 * AI captions for one image, best first. The leader gets a "crowd favorite" tag.
 * Only the top `visible` captions show; the rest fold away behind "Show more".
 */
export function CaptionList({
  captions,
  signedIn,
  visible = 4,
  emptyText = "Nothing here yet.",
  savedIds = new Set(),
}: Props) {
  if (captions.length === 0) return <p className="caption-empty">{emptyText}</p>;

  const top = captions.slice(0, visible);
  const rest = captions.slice(visible);

  return (
    <div className="caption-stack">
      <ol className="caption-list">
        {top.map((caption, index) => (
          <CaptionRow key={caption.id} caption={caption} signedIn={signedIn} leader={index === 0 && caption.score > 0} saved={savedIds.has(caption.id)} />
        ))}
      </ol>
      {rest.length > 0 && (
        <details className="caption-more">
          <summary>
            Show {rest.length} more spot{rest.length === 1 ? "" : "s"}
          </summary>
          <ol className="caption-list">
            {rest.map((caption) => (
              <CaptionRow key={caption.id} caption={caption} signedIn={signedIn} leader={false} saved={savedIds.has(caption.id)} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function CaptionRow(props: { caption: Caption; signedIn: boolean; leader: boolean; saved: boolean }) {
  const { caption, signedIn, leader, saved } = props;
  const isSpot = caption.request_id !== null;
  return (
    <li className="caption-row" data-leader={leader}>
      <div className="caption-body">
        {leader && <span className="leader-tag">👑 Crowd favorite</span>}
        <CaptionContent content={caption.content} />
        {isSpot && caption.image && (
          <figure className="spot-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="spot-image" src={caption.image.url} alt={caption.image.label} loading="lazy" referrerPolicy="no-referrer" />
            <figcaption className="spot-image-note">
              {caption.image.label} ·{" "}
              {caption.image.link ? (
                <>
                  photo via{" "}
                  <a href={caption.image.link} target="_blank" rel="noopener noreferrer">
                    {caption.image.source}
                  </a>
                </>
              ) : (
                caption.image.source
              )}
            </figcaption>
          </figure>
        )}
        <div className="caption-actions">
          <VoteButtons captionId={caption.id} score={caption.score} myVote={caption.myVote} signedIn={signedIn} />
          {isSpot && <PlanButton captionId={caption.id} saved={saved} signedIn={signedIn} />}
          {isSpot && signedIn && !caption.image && <SpotImageButton captionId={caption.id} />}
        </div>
      </div>
    </li>
  );
}

/** Place recommendations render as name + neighborhood + reason; anything else as plain text. */
export function CaptionContent({ content }: { content: string }) {
  const spot = parseSpot(content);
  if (!spot) return <p className="caption-text">{content}</p>;

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name} ${spot.area} New York`)}`;
  return (
    <div className="spot">
      <p className="spot-name">
        {spot.name}
        {spot.price && <span className="spot-price">{spot.price}</span>}
      </p>
      <p className="spot-meta">
        {spot.area && <span>📍 {spot.area}</span>}
        <a href={maps} target="_blank" rel="noopener noreferrer">
          Open in Maps ↗
        </a>
      </p>
      <p className="caption-text">{spot.why}</p>
    </div>
  );
}
